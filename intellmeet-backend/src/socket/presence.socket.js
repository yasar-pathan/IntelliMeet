const redis = require('../config/redis');
const User = require('../models/User');
const logger = require('../utils/logger');

const registerPresenceHandlers = (io, socket) => {
  const userId = socket.user._id;

  // 1. Manually update status (online, away, busy)
  socket.on('presence:set-status', async ({ status }) => {
    const validStatuses = ['online', 'away', 'busy'];
    if (!status || !validStatuses.includes(status)) return;

    try {
      const user = await User.findById(userId).select('teams name avatar');
      if (!user) return;

      logger.info(`User ${userId} set presence status explicitly to: ${status}`);

      // Update in Redis
      if (status === 'online') {
        await redis.set(`online:${userId}`, '1', 'EX', 3600);
      } else {
        await redis.set(`online:${userId}`, status, 'EX', 3600);
      }

      // Broadcast update to all user teams
      if (user.teams && user.teams.length > 0) {
        user.teams.forEach((teamId) => {
          io.to(`team:${teamId}`).emit('presence:status-changed', {
            userId,
            status,
            name: user.name,
            avatar: user.avatar
          });
        });
      }
    } catch (err) {
      logger.error(`Error changing presence status: ${err.message}`);
    }
  });

  // 2. Heartbeat to renew Redis presence expiry
  socket.on('presence:heartbeat', async () => {
    try {
      const redisKey = `online:${userId}`;
      const status = await redis.get(redisKey);
      
      // Reset TTL to 1 hour
      if (status) {
        await redis.expire(redisKey, 3600);
      } else {
        // Fallback recreate if expired
        await redis.set(redisKey, '1', 'EX', 3600);
      }
    } catch (err) {
      logger.error(`Error processing presence heartbeat: ${err.message}`);
    }
  });
};

module.exports = registerPresenceHandlers;
