const express = require('express');
const mongoose = require('mongoose');
const redisClient = require('../config/redis');
const ApiResponse = require('../utils/ApiResponse');

// Import individual routers
const authRouter = require('./auth.routes');
const userRouter = require('./user.routes');
const meetingRouter = require('./meeting.routes');
const aiRouter = require('./ai.routes');
const chatRouter = require('./chat.routes');
const taskRouter = require('./task.routes');
const teamRouter = require('./team.routes');
const notificationRouter = require('./notification.routes');
const analyticsRouter = require('./analytics.routes');

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    API Health check endpoint returning uptime and service connectivity states
 * @access  Public
 */
router.get('/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = redisClient.status === 'ready' ? 'connected' : 'disconnected';

  const healthData = {
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: mongoStatus,
      redis: redisStatus
    }
  };

  res.status(200).json(new ApiResponse(200, healthData, 'System health report retrieved'));
});

// Mount routers under specific prefixes
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/meetings', meetingRouter);
router.use('/ai', aiRouter);
router.use('/chat', chatRouter);
router.use('/tasks', taskRouter);
router.use('/teams', teamRouter);
router.use('/notifications', notificationRouter);
router.use('/analytics', analyticsRouter);

module.exports = router;
