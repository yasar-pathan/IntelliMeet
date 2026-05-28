const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const User = require('../models/User');
const logger = require('../utils/logger');

// Import individual socket event handlers
const registerMeetingHandlers = require('./meeting.socket');
const registerChatHandlers = require('./chat.socket');
const registerPresenceHandlers = require('./presence.socket');
const registerNotificationHandlers = require('./notification.socket');

const initSocketManager = (io) => {
  // Connection Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Token is required'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      logger.error(`Socket connection auth failed: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id;
    logger.info(`Socket client connected: ${socket.id} (User: ${userId})`);

    // 1. Join personal room
    const personalRoom = `user:${userId}`;
    socket.join(personalRoom);

    // 2. Track online state in Redis
    await redis.set(`online:${userId}`, '1', 'EX', 3600);

    // 3. Update online status in Database and retrieve teams
    try {
      const user = await User.findById(userId).select('teams name avatar');
      if (user) {
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();

        // Join socket rooms for each team the user belongs to
        if (user.teams && user.teams.length > 0) {
          user.teams.forEach((teamId) => {
            const teamRoom = `team:${teamId}`;
            socket.join(teamRoom);
            
            // Broadcast user presence update to team rooms
            socket.to(teamRoom).emit('presence:update', {
              userId,
              name: user.name,
              avatar: user.avatar,
              isOnline: true,
              lastSeen: user.lastSeen
            });
          });
        }
      }
    } catch (dbErr) {
      logger.error(`Error updating user status on connection: ${dbErr.message}`);
    }

    // 4. Register modular handlers
    registerMeetingHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerNotificationHandlers(io, socket);

    // Disconnect event lifecycle
    socket.on('disconnect', async () => {
      logger.info(`Socket client disconnected: ${socket.id} (User: ${userId})`);
      
      // Remove online marker from Redis
      await redis.del(`online:${userId}`);

      try {
        const user = await User.findById(userId).select('teams name avatar');
        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          await user.save();

          // Broadcast user going offline to their teams
          if (user.teams && user.teams.length > 0) {
            user.teams.forEach((teamId) => {
              socket.to(`team:${teamId}`).emit('presence:update', {
                userId,
                name: user.name,
                avatar: user.avatar,
                isOnline: false,
                lastSeen: user.lastSeen
              });
            });
          }
        }
      } catch (dbErr) {
        logger.error(`Error updating user status on disconnect: ${dbErr.message}`);
      }
    });
  });
};

module.exports = initSocketManager;
