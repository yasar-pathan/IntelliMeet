const Notification = require('../models/Notification');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { getIO } = require('../config/socket');

/**
 * Creates a notification in the database, emits a real-time socket event, and invalidates Redis count cache.
 * @param {string} recipientId - Recipient user ID
 * @param {string} senderId - Sender user ID
 * @param {string} type - Notification type enum
 * @param {string} title - Notification title
 * @param {string} message - Notification text
 * @param {Object} data - Contextual metadata
 * @returns {Promise<Object>} Created notification
 */
const createAndSend = async ({ recipient, sender, type, title, message, data = {} }) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      data
    });

    // Invalidate Redis unread count cache
    const redisKey = `notifications:unread:${recipient}`;
    await redis.del(redisKey);

    // Emit socket event if Socket.io is initialized
    try {
      const io = getIO();
      const personalRoom = `user:${recipient}`;
      io.to(personalRoom).emit('notification:new', notification);
      logger.info(`Notification socket emitted to room: ${personalRoom}`);
    } catch (sockErr) {
      // Gracefully log but don't fail, since tests or startup might run without socket initialized
      logger.debug(`Socket.io not active, skipped real-time broadcast: ${sockErr.message}`);
    }

    return notification;
  } catch (error) {
    logger.error(`Error in notification creation/sending: ${error.message}`);
    throw error;
  }
};

/**
 * Marks a notification as read and resets Redis cache.
 * @param {string} notificationId 
 * @param {string} userId 
 * @returns {Promise<Object>} Updated notification
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (notification) {
      // Invalidate Redis cache
      await redis.del(`notifications:unread:${userId}`);
    }
    return notification;
  } catch (error) {
    logger.error(`Error marking notification as read: ${error.message}`);
    throw error;
  }
};

/**
 * Returns number of unread notifications, caching the result in Redis for 1 minute.
 * @param {string} userId 
 * @returns {Promise<number>} Unread count
 */
const getUnreadCount = async (userId) => {
  try {
    const redisKey = `notifications:unread:${userId}`;
    const cachedCount = await redis.get(redisKey);

    if (cachedCount !== null) {
      return parseInt(cachedCount, 10);
    }

    const count = await Notification.countDocuments({ recipient: userId, isRead: false });
    
    // Cache for 1 minute (60 seconds)
    await redis.set(redisKey, count, 'EX', 60);
    return count;
  } catch (error) {
    logger.error(`Error getting notification unread count: ${error.message}`);
    // Fallback to direct DB query if Redis fails
    return await Notification.countDocuments({ recipient: userId, isRead: false });
  }
};

module.exports = {
  createAndSend,
  markAsRead,
  getUnreadCount
};
