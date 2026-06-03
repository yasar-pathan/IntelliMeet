const User = require('../models/User');
const Team = require('../models/Team');
const redis = require('../config/redis');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const authService = require('../services/auth.service');

// Helper to extract Cloudinary public ID from URL
const getCloudinaryPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/');
    const fileWithExt = parts[parts.length - 1];
    const publicId = fileWithExt.split('.')[0];
    
    // Check if there is a folder prefix
    const folderIndex = parts.indexOf('intellmeet');
    if (folderIndex !== -1) {
      return `intellmeet/${publicId}`;
    }
    return publicId;
  } catch (err) {
    logger.error(`Error parsing Cloudinary public ID from URL ${url}: ${err.message}`);
    return null;
  }
};

/**
 * @route   GET /api/v1/users/me
 * @desc    Get logged in user profile (populated with teams)
 * @access  Private
 * @returns { ApiResponse } 200 OK status with populated user profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const redisKey = `user:profile:${userId}`;

  // Check cache first
  const cachedProfile = await redis.get(redisKey);
  if (cachedProfile) {
    return res.status(200).json(
      new ApiResponse(200, JSON.parse(cachedProfile), 'User profile retrieved successfully (cached)')
    );
  }

  const user = await User.findById(userId)
    .populate('teams', 'name avatar description')
    .lean();

  if (!user || !user.isActive) {
    throw new ApiError(404, 'User profile not found');
  }

  // Cache user profile for 5 minutes (300 seconds)
  await redis.set(redisKey, JSON.stringify(user), 'EX', 300);

  res.status(200).json(
    new ApiResponse(200, user, 'User profile retrieved successfully')
  );
});

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get public profile of another user
 * @access  Private
 * @returns { ApiResponse } 200 OK status with public profile
 */
const getPublicProfile = asyncHandler(async (req, res) => {
  const targetId = req.params.userId;
  const requesterId = req.user._id;

  const targetUser = await User.findById(targetId).lean();
  if (!targetUser || !targetUser.isActive) {
    throw new ApiError(404, 'User not found');
  }

  // Find shared teams
  const sharedTeams = await Team.find({
    'members.user': requesterId,
    _id: { $in: targetUser.teams || [] }
  }, 'name avatar description').lean();

  // Construct public profile
  const publicProfile = {
    _id: targetUser._id,
    name: targetUser.name,
    avatar: targetUser.avatar,
    role: targetUser.role,
    isOnline: targetUser.isOnline,
    lastSeen: targetUser.lastSeen,
    sharedTeams
  };

  res.status(200).json(
    new ApiResponse(200, publicProfile, 'User profile retrieved successfully')
  );
});

/**
 * @route   PATCH /api/v1/users/me
 * @desc    Update user name
 * @access  Private
 * @body    { name }
 * @returns { ApiResponse } 200 OK status with updated user
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { name } = req.body;

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(404, 'User not found');
  }

  user.name = name;
  await user.save();

  // Invalidate cache
  await redis.del(`user:profile:${userId}`);
  await redis.del(`session:${userId}`);

  const updatedUser = user.toObject();
  delete updatedUser.password;

  res.status(200).json(
    new ApiResponse(200, updatedUser, 'Profile updated successfully')
  );
});

/**
 * @route   PATCH /api/v1/users/me/avatar
 * @desc    Upload/Update avatar image to Cloudinary
 * @access  Private
 * @returns { ApiResponse } 200 OK status with new avatar URL
 */
const updateAvatar = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) {
    throw new ApiError(400, 'Please upload an image file');
  }

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(404, 'User not found');
  }

  const newAvatarUrl = req.file.path; // CloudinaryStorage uploads automatically

  // Delete previous avatar from Cloudinary if it's not the default
  const defaultAvatar = 'https://res.cloudinary.com/dqv67vquc/image/upload/v1700000000/default_avatar_intellmeet.png';
  if (user.avatar && user.avatar !== defaultAvatar) {
    const oldPublicId = getCloudinaryPublicId(user.avatar);
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
        logger.info(`Deleted old Cloudinary avatar: ${oldPublicId}`);
      } catch (err) {
        logger.error(`Failed to delete old Cloudinary asset: ${err.message}`);
      }
    }
  }

  // Save new URL to database
  user.avatar = newAvatarUrl;
  await user.save();

  // Invalidate Redis caches
  await redis.del(`user:profile:${userId}`);
  await redis.del(`session:${userId}`);

  res.status(200).json(
    new ApiResponse(200, { avatar: newAvatarUrl }, 'Avatar updated successfully')
  );
});

/**
 * @route   PATCH /api/v1/users/me/preferences
 * @desc    Update notification preference, theme, and language
 * @access  Private
 * @body    { notifications, theme, language }
 * @returns { ApiResponse } 200 OK status with updated preferences
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notifications, theme, language } = req.body;

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(404, 'User not found');
  }

  if (notifications !== undefined) user.preferences.notifications = notifications;
  if (theme !== undefined) user.preferences.theme = theme;
  if (language !== undefined) user.preferences.language = language;

  await user.save();

  // Invalidate Redis caches
  await redis.del(`user:profile:${userId}`);
  await redis.del(`session:${userId}`);

  res.status(200).json(
    new ApiResponse(200, user.preferences, 'Preferences updated successfully')
  );
});

/**
 * @route   DELETE /api/v1/users/me
 * @desc    Soft delete user account
 * @access  Private
 * @returns { ApiResponse } 200 OK success message
 */
const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const authHeader = req.header('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(404, 'User not found');
  }

  // Soft delete state changes
  user.isActive = false;
  user.isOnline = false;
  user.lastSeen = new Date();
  user.refreshTokens = [];
  await user.save();

  // Remove user from all team memberships
  await Team.updateMany(
    { 'members.user': userId },
    { $pull: { members: { user: userId } } }
  );

  // Blacklist token in Redis and clear session
  if (accessToken) {
    await authService.revokeAccessToken(accessToken);
  }
  
  // Clear all related user Redis caches
  await redis.del(`user:profile:${userId}`);
  await redis.del(`session:${userId}`);
  await redis.del(`notifications:unread:${userId}`);

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.status(200).json(
    new ApiResponse(200, null, 'User account deactivated successfully')
  );
});

/**
 * @route   GET /api/v1/users/search
 * @desc    Search for other users who share at least one team with the requester
 * @access  Private
 * @query   { q }
 * @returns { ApiResponse } 200 OK status with array of users matched
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const requesterId = req.user._id;

  // Retrieve requester's team IDs
  const requester = await User.findById(requesterId);
  if (!requester || !requester.isActive) {
    throw new ApiError(404, 'Requester not found');
  }

  const teamIds = requester.teams || [];

  if (teamIds.length === 0) {
    // If user is not in any team, they cannot search for teammates (privacy rule)
    return res.status(200).json(
      new ApiResponse(200, [], 'No teammates found')
    );
  }

  // Search logic: Match active users, inside the same teams list, whose name/email matches search query
  const queryRegex = new RegExp(q, 'i');
  
  const matches = await User.find({
    _id: { $ne: requesterId },
    isActive: true,
    teams: { $in: teamIds },
    $or: [
      { name: queryRegex },
      { email: queryRegex }
    ]
  })
    .select('_id name avatar email isOnline')
    .limit(20)
    .lean();

  res.status(200).json(
    new ApiResponse(200, matches, 'User search completed')
  );
});

module.exports = {
  getProfile,
  getPublicProfile,
  updateProfile,
  updateAvatar,
  updatePreferences,
  deleteUser,
  searchUsers
};
