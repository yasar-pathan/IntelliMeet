const crypto = require('crypto');
const User = require('../models/User');
const authService = require('../services/auth.service');
const emailService = require('../services/email.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const redis = require('../config/redis');

// Helper to set refresh token cookie
const setRefreshTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  res.cookie('refreshToken', token, cookieOptions);
};

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user and trigger email verification
 * @access  Public
 * @body    { name, email, password, confirmPassword }
 * @returns { ApiResponse } 201 Created status with user object
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  // Generate verification token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create user (password hashed in pre-save hook)
  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: tokenExpiry
  });

  // Send verification email (async)
  emailService.sendVerificationEmail(user.email, rawToken);

  const createdUser = await User.findById(user._id).select('-password');

  res.status(201).json(
    new ApiResponse(201, createdUser, 'Registration successful. Please check your email to verify your account.')
  );
});

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify user email via URL token
 * @access  Public
 * @query   { token }
 * @returns { ApiResponse } 200 OK status with access token and user info
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;

  if (!token) {
    throw new ApiError(400, 'Verification token is required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with token and check if token is still valid
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: new Date() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification token');
  }

  // Update user state
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();

  // Log user in automatically after email verification
  const { accessToken, refreshToken } = await authService.generateAuthTokens(user);

  setRefreshTokenCookie(res, refreshToken);

  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.refreshTokens;

  res.status(200).json(
    new ApiResponse(200, { accessToken, user: userResponse }, 'Email verified successfully')
  );
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and initiate session
 * @access  Public
 * @body    { email, password }
 * @returns { ApiResponse } 200 OK status with access token and user info
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user (explicitly selecting password)
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check email verification status
  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email address before logging in');
  }

  // Check password correctness
  const isCorrect = await user.isPasswordCorrect(password);
  if (!isCorrect) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Generate tokens and update presence
  const { accessToken, refreshToken } = await authService.generateAuthTokens(user);

  // Set httpOnly cookie
  setRefreshTokenCookie(res, refreshToken);

  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.refreshTokens;

  res.status(200).json(
    new ApiResponse(200, { accessToken, refreshToken, user: userResponse }, 'Login successful')
  );
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Log out current user session
 * @access  Private (auth required)
 * @returns { ApiResponse } 200 OK success message
 */
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  const authHeader = req.header('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || req.cookies?.accessToken;

  if (!accessToken) {
    throw new ApiError(400, 'Access token is required to log out');
  }

  // Get user from request context (set by verifyJWT middleware)
  const user = await User.findById(req.user._id).select('+refreshTokens');

  if (user) {
    await authService.logout(user, accessToken, refreshToken);
  }

  // Clear cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Rotate and refresh access & refresh tokens
 * @access  Public
 * @returns { ApiResponse } 200 OK status with new access token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!oldRefreshToken) {
    throw new ApiError(401, 'Refresh token is required');
  }

  const { accessToken, refreshToken: newRefreshToken, user } = await authService.rotateTokens(oldRefreshToken);

  // Set new cookie
  setRefreshTokenCookie(res, newRefreshToken);

  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.refreshTokens;

  res.status(200).json(
    new ApiResponse(200, { accessToken, refreshToken: newRefreshToken, user: userResponse }, 'Tokens rotated successfully')
  );
});

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Initiate password reset flow
 * @access  Public
 * @body    { email }
 * @returns { ApiResponse } 200 OK status (always, preventing email validation scanners)
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (user) {
    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = hashedToken;
    user.passwordResetExpiry = tokenExpiry;
    await user.save();

    // Send reset email
    emailService.sendPasswordResetEmail(user.email, rawToken);
  }

  // Always return 200 OK for privacy/security
  res.status(200).json(
    new ApiResponse(200, null, 'If that email address is registered, a password reset link has been sent.')
  );
});

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Confirm password reset token and update password
 * @access  Public
 * @query   { token }
 * @body    { newPassword, confirmPassword }
 * @returns { ApiResponse } 200 OK success message
 */
const resetPassword = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;
  const { newPassword } = req.body;

  if (!token) {
    throw new ApiError(400, 'Reset token is required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: new Date() }
  }).select('+refreshTokens');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired password reset token');
  }

  // Set new password
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;

  // Invalidate all existing sessions/refresh tokens for security
  user.refreshTokens = [];

  await user.save();

  // Delete session cache from Redis
  await redis.del(`session:${user._id}`);

  res.status(200).json(new ApiResponse(200, null, 'Password reset successful. Please login with your new password.'));
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Retrieve logged-in user profile details
 * @access  Private (auth required)
 * @returns { ApiResponse } 200 OK status with user object
 */
const me = asyncHandler(async (req, res) => {
  // Attached to req.user by verifyJWT middleware
  res.status(200).json(
    new ApiResponse(200, req.user, 'Current user retrieved successfully')
  );
});

module.exports = {
  register,
  verifyEmail,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  me
};
