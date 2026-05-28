const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redis = require('../config/redis');
const ApiError = require('../utils/ApiError');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');
const logger = require('../utils/logger');

/**
 * Generate access and refresh tokens, update online status, and cache session in Redis.
 * @param {Object} user - User document
 * @returns {Promise<Object>} Object containing accessToken and refreshToken
 */
const generateAuthTokens = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Push new refresh token to user's refreshTokens array (multi-device support)
  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push(refreshToken);
  user.isOnline = true;
  user.lastSeen = new Date();
  
  await user.save();

  // Cache session in Redis (15 mins)
  const userPayload = user.toObject();
  delete userPayload.password;
  delete userPayload.refreshTokens;
  delete userPayload.emailVerificationToken;
  delete userPayload.passwordResetToken;

  await redis.set(`session:${user._id}`, JSON.stringify(userPayload), 'EX', 900);

  return { accessToken, refreshToken };
};

/**
 * Handle refresh token rotation. Issues new token pair and revokes old refresh token.
 * @param {string} oldRefreshToken 
 * @returns {Promise<Object>} Object containing new accessToken and refreshToken
 */
const rotateTokens = async (oldRefreshToken) => {
  try {
    const decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Find user by decoded ID, retrieving password and refresh tokens
    const user = await User.findById(decoded._id).select('+refreshTokens');
    if (!user || !user.isActive) {
      throw new ApiError(401, 'User account is inactive or not found');
    }

    // Refresh token reuse detection (Token Rotation)
    if (!user.refreshTokens.includes(oldRefreshToken)) {
      // Security breach: Token reused! Clear all user refresh tokens.
      user.refreshTokens = [];
      await user.save();
      logger.warn(`Security warning: Re-used refresh token detected for user ${user._id}. Revoked all tokens.`);
      throw new ApiError(401, 'Suspicious login state. Please login again');
    }

    // Remove old refresh token from list
    user.refreshTokens = user.refreshTokens.filter(token => token !== oldRefreshToken);

    // Issue new pair
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens.push(refreshToken);
    await user.save();

    return { accessToken, refreshToken, user };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error(`Refresh Token Rotation failed: ${error.message}`);
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
};

/**
 * Blacklist current access token and remove specific refresh token from DB.
 * @param {Object} user - User document
 * @param {string} accessToken 
 * @param {string} refreshToken 
 */
const logout = async (user, accessToken, refreshToken) => {
  // Remove refresh token
  if (refreshToken) {
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
  }
  user.isOnline = false;
  user.lastSeen = new Date();
  await user.save();

  // Blacklist access token in Redis
  try {
    const decoded = jwt.decode(accessToken);
    if (decoded && decoded.exp) {
      const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
      if (remainingTime > 0) {
        // Cache token in blacklist till its natural expiration
        await redis.set(`blacklist:${accessToken}`, '1', 'EX', remainingTime);
      }
    }
  } catch (err) {
    logger.error(`Failed to blacklist access token: ${err.message}`);
  }

  // Delete session cache
  await redis.del(`session:${user._id}`);
};

/**
 * Verify access token and blacklist it (e.g., for password resets or administrative revokes).
 * @param {string} token 
 */
const revokeAccessToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
      if (remainingTime > 0) {
        await redis.set(`blacklist:${token}`, '1', 'EX', remainingTime);
      }
    }
  } catch (error) {
    logger.error(`Failed to revoke access token: ${error.message}`);
  }
};

module.exports = {
  generateAuthTokens,
  rotateTokens,
  logout,
  revokeAccessToken
};
