const crypto = require('crypto');
const Team = require('../models/Team');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const redis = require('../config/redis');

// Helper to generate 10-char alphanumeric invite code
const generateInviteCode = () => {
  return crypto.randomBytes(5).toString('hex'); // 10 characters
};

/**
 * @route   POST /api/v1/teams
 * @desc    Create a new team workspace
 * @access  Private
 * @body    { name, description, settings }
 * @returns { ApiResponse } 201 Created status with team object
 */
const createTeam = asyncHandler(async (req, res) => {
  const { name, description, settings } = req.body;
  const ownerId = req.user._id;

  // Generate unique invite code
  const inviteCode = generateInviteCode();
  const inviteCodeExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

  const team = await Team.create({
    name,
    description,
    owner: ownerId,
    inviteCode,
    inviteCodeExpiry,
    members: [{ user: ownerId, role: 'owner', joinedAt: new Date() }],
    settings: {
      isPublic: settings?.isPublic !== undefined ? settings.isPublic : false,
      allowMemberInvite: settings?.allowMemberInvite !== undefined ? settings.allowMemberInvite : true
    }
  });

  // Link team to owner user profile
  await User.findByIdAndUpdate(ownerId, { $addToSet: { teams: team._id } });
  
  // Invalidate Redis profile cache
  await redis.del(`user:profile:${ownerId}`);

  res.status(201).json(new ApiResponse(201, team, 'Team workspace created successfully'));
});

/**
 * @route   GET /api/v1/teams
 * @desc    List all teams user belongs to
 * @access  Private
 * @returns { ApiResponse } 200 OK status with user's teams
 */
const getMyTeams = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const teams = await Team.find({ 'members.user': userId })
    .populate('owner', 'name avatar')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, teams, 'User teams list retrieved'));
});

/**
 * @route   GET /api/v1/teams/:teamId
 * @desc    Retrieve team workspace details, members and recent meetings
 * @access  Private
 * @returns { ApiResponse } 200 OK status with team details object
 */
const getTeamById = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;

  const team = await Team.findById(teamId)
    .populate('owner', 'name avatar email')
    .populate('members.user', 'name avatar email isOnline lastSeen');

  if (!team) {
    throw new ApiError(404, 'Team workspace not found');
  }

  // Verify access permissions
  const isMember = team.members.some(m => m.user._id.toString() === userId.toString());
  if (!isMember) {
    throw new ApiError(403, 'Forbidden: You are not a member of this team workspace');
  }

  // Retrieve recent meetings of the team
  const recentMeetings = await Meeting.find({ team: teamId })
    .sort({ scheduledAt: -1 })
    .limit(10)
    .populate('host', 'name avatar');

  res.status(200).json(
    new ApiResponse(200, { team, recentMeetings }, 'Team details fetched successfully')
  );
});

/**
 * @route   PATCH /api/v1/teams/:teamId
 * @desc    Update team metadata/settings
 * @access  Private (owner/admin only)
 * @returns { ApiResponse } 200 OK status with updated team doc
 */
const updateTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;
  const { name, description, settings } = req.body;

  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Verify permissions (owner or admin only)
  const member = team.members.find(m => m.user.toString() === userId.toString());
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new ApiError(403, 'Forbidden: Only owners and admins can update team details');
  }

  if (name) team.name = name;
  if (description) team.description = description;
  if (settings) {
    team.settings = {
      ...team.settings,
      ...settings
    };
  }

  await team.save();

  res.status(200).json(new ApiResponse(200, team, 'Team updated successfully'));
});

/**
 * @route   DELETE /api/v1/teams/:teamId
 * @desc    Delete a team workspace (owner only)
 * @access  Private (owner only)
 * @returns { ApiResponse } 200 OK success message
 */
const deleteTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;

  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Verify that requester is owner
  if (team.owner.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden: Only the workspace owner can delete this team');
  }

  // Remove references in User documents
  const memberUserIds = team.members.map(m => m.user);
  await User.updateMany(
    { _id: { $in: memberUserIds } },
    { $pull: { teams: teamId } }
  );

  // Hard delete workspace
  await Team.findByIdAndDelete(teamId);

  // Invalidate user profile Redis caches
  for (const uid of memberUserIds) {
    await redis.del(`user:profile:${uid}`);
  }

  res.status(200).json(new ApiResponse(200, null, 'Team workspace deleted successfully'));
});

/**
 * @route   POST /api/v1/teams/:teamId/invite
 * @desc    Regenerate active invite code link for team (members only)
 * @access  Private
 * @returns { ApiResponse } 200 OK status with new invite code info
 */
const generateInviteLink = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;

  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  const member = team.members.find(m => m.user.toString() === userId.toString());
  if (!member) {
    throw new ApiError(403, 'Forbidden: You must be a member to generate invites');
  }

  // Check settings
  if (!team.settings.allowMemberInvite && member.role === 'member') {
    throw new ApiError(403, 'Forbidden: Member invites are disabled by workspace administration');
  }

  // Generate code valid for 7 days
  const inviteCode = generateInviteCode();
  team.inviteCode = inviteCode;
  team.inviteCodeExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await team.save();

  res.status(200).json(
    new ApiResponse(200, { inviteCode, expiry: team.inviteCodeExpiry }, 'Invite link generated successfully')
  );
});

/**
 * @route   POST /api/v1/teams/join/:inviteCode
 * @desc    Join team using invite code URL
 * @access  Private
 * @returns { ApiResponse } 200 OK status with joined team
 */
const joinTeamByInviteCode = asyncHandler(async (req, res) => {
  const { inviteCode } = req.params;
  const userId = req.user._id;

  const team = await Team.findOne({
    inviteCode,
    inviteCodeExpiry: { $gt: new Date() }
  });

  if (!team) {
    throw new ApiError(400, 'Invalid or expired team invite code');
  }

  // Check if already a member
  const isMember = team.members.some(m => m.user.toString() === userId.toString());
  if (isMember) {
    throw new ApiError(400, 'You are already a member of this team');
  }

  // Add to team members
  team.members.push({
    user: userId,
    role: 'member',
    joinedAt: new Date()
  });

  await team.save();

  // Add team reference to User profile
  await User.findByIdAndUpdate(userId, { $addToSet: { teams: team._id } });

  // Invalidate caches
  await redis.del(`user:profile:${userId}`);

  res.status(200).json(new ApiResponse(200, team, 'Joined team workspace successfully'));
});

/**
 * @route   DELETE /api/v1/teams/:teamId/members/:userId
 * @desc    Remove member from team (owner/admin only)
 * @access  Private (owner/admin only)
 * @returns { ApiResponse } 200 OK success message
 */
const removeMember = asyncHandler(async (req, res) => {
  const { teamId, userId: targetUserId } = req.params;
  const requesterId = req.user._id;

  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Find requester role
  const requesterMember = team.members.find(m => m.user.toString() === requesterId.toString());
  if (!requesterMember) {
    throw new ApiError(403, 'Forbidden: You are not a member of this team');
  }

  const targetMember = team.members.find(m => m.user.toString() === targetUserId.toString());
  if (!targetMember) {
    throw new ApiError(404, 'Member not found in team workspace');
  }

  // Role validation
  if (targetMember.role === 'owner') {
    throw new ApiError(400, 'Cannot remove the owner of the team workspace');
  }

  const isRequesterOwner = requesterMember.role === 'owner';
  const isRequesterAdmin = requesterMember.role === 'admin';

  if (!isRequesterOwner && !isRequesterAdmin) {
    throw new ApiError(403, 'Forbidden: Only owner and admins can remove members');
  }

  if (targetMember.role === 'admin' && !isRequesterOwner) {
    throw new ApiError(403, 'Forbidden: Only the workspace owner can remove administrators');
  }

  // Pull member from team
  team.members = team.members.filter(m => m.user.toString() !== targetUserId.toString());
  await team.save();

  // Pull team from user profile
  await User.findByIdAndUpdate(targetUserId, { $pull: { teams: teamId } });

  // Invalidate caches
  await redis.del(`user:profile:${targetUserId}`);

  res.status(200).json(new ApiResponse(200, null, 'Member removed from team workspace'));
});

/**
 * @route   PATCH /api/v1/teams/:teamId/members/:userId/role
 * @desc    Change member workspace role (owner/admin only)
 * @access  Private (owner/admin only)
 * @returns { ApiResponse } 200 OK status with updated team doc
 */
const updateMemberRole = asyncHandler(async (req, res) => {
  const { teamId, userId: targetUserId } = req.params;
  const { role } = req.body;
  const requesterId = req.user._id;

  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  const requesterMember = team.members.find(m => m.user.toString() === requesterId.toString());
  if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
    throw new ApiError(403, 'Forbidden: Insufficient workspace permissions');
  }

  const targetMemberIdx = team.members.findIndex(m => m.user.toString() === targetUserId.toString());
  if (targetMemberIdx === -1) {
    throw new ApiError(404, 'Member not found in team workspace');
  }

  // Constraints check
  if (team.members[targetMemberIdx].role === 'owner' && role !== 'owner') {
    throw new ApiError(400, 'Cannot demote the workspace owner. Transfer ownership instead.');
  }

  // Only owners can promote someone else to owner (transfers owner role to target, making requester an admin)
  if (role === 'owner') {
    if (requesterMember.role !== 'owner') {
      throw new ApiError(403, 'Forbidden: Only the current owner can transfer team ownership');
    }
    
    // Transfer ownership
    team.owner = targetUserId;
    team.members[targetMemberIdx].role = 'owner';
    const reqMemberIdx = team.members.findIndex(m => m.user.toString() === requesterId.toString());
    team.members[reqMemberIdx].role = 'admin'; // make former owner an admin
  } else {
    // Admins cannot change admin roles or demote admins
    if (requesterMember.role === 'admin' && (team.members[targetMemberIdx].role === 'admin' || role === 'admin')) {
      throw new ApiError(403, 'Forbidden: Admins cannot change administrator privileges');
    }
    
    team.members[targetMemberIdx].role = role;
  }

  await team.save();

  res.status(200).json(new ApiResponse(200, team, 'Member role updated successfully'));
});

module.exports = {
  createTeam,
  getMyTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  generateInviteLink,
  joinTeamByInviteCode,
  removeMember,
  updateMemberRole
};
