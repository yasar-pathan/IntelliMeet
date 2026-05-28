const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Meeting = require('../models/Meeting');
const redis = require('../config/redis');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Generate time-limited TURN credentials per RFC 5766 / RFC 8489.
 * @param {string} userId - User ID
 * @returns {Object} TURN credentials object
 */
const generateTurnCredentials = (userId) => {
  const turnUrl = process.env.TURN_SERVER_URL;
  const sharedSecret = process.env.TURN_SERVER_CREDENTIAL;
  const usernamePrefix = process.env.TURN_SERVER_USERNAME || 'intellmeet';

  if (!turnUrl || !sharedSecret) {
    logger.warn('TURN server configuration is incomplete. Standard WebRTC TURN creds will fallback to mock credentials.');
    return {
      urls: ['stun:stun.l.google.com:19302'],
      username: 'mock-user',
      credential: 'mock-credential',
      ttl: 86400
    };
  }

  // 1 day expiration
  const ttl = 86400; 
  const expiryTimestamp = Math.floor(Date.now() / 1000) + ttl;
  
  // Format username: timestamp:userId or timestamp:usernamePrefix
  const generatedUsername = `${expiryTimestamp}:${usernamePrefix}_${userId}`;
  
  // Generate HMAC-SHA1 of username using the shared secret
  const hmacDigest = crypto
    .createHmac('sha1', sharedSecret)
    .update(generatedUsername)
    .digest('base64');

  return {
    urls: [turnUrl],
    username: generatedUsername,
    credential: hmacDigest,
    ttl: ttl
  };
};

/**
 * Hash password if meeting password protection is enabled.
 * @param {string} password - Raw password
 * @returns {Promise<string>} Hashed password
 */
const hashMeetingPassword = async (password) => {
  if (!password) return null;
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Verify joining password against stored hash.
 * @param {string} inputPassword - Plaintext input
 * @param {string} hashedPassword - Hashed DB password
 * @returns {Promise<boolean>} Match results
 */
const verifyMeetingPassword = async (inputPassword, hashedPassword) => {
  if (!hashedPassword) return true; // No password required
  if (!inputPassword) return false; // Password required but not provided
  return await bcrypt.compare(inputPassword, hashedPassword);
};

/**
 * Reads transcript from Redis key transcript:{meetingId}, writes it to MongoDB, and deletes the Redis key.
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<string>} Saved transcript
 */
const flushTranscriptToMongo = async (meetingId) => {
  try {
    const redisKey = `transcript:${meetingId}`;
    const transcript = await redis.get(redisKey);
    
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error(`Meeting not found during transcript flush: ${meetingId}`);
    }

    if (transcript) {
      meeting.transcript = transcript;
      logger.info(`Flushed transcript from Redis to MongoDB for meeting ${meetingId}. Length: ${transcript.length}`);
    } else {
      meeting.transcript = '';
      logger.info(`No transcript found in Redis to flush for meeting ${meetingId}. Saved empty transcript.`);
    }

    await meeting.save();
    
    // Delete Redis key
    await redis.del(redisKey);
    return meeting.transcript;
  } catch (error) {
    logger.error(`Error flushing transcript to MongoDB for meeting ${meetingId}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  generateTurnCredentials,
  hashMeetingPassword,
  verifyMeetingPassword,
  flushTranscriptToMongo
};
