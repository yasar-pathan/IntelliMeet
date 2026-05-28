// Load environment variables immediately
require('dotenv').config();

const http = require('http');
const mongoose = require('mongoose');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const redis = require('./src/config/redis');
const { initSocket } = require('./src/config/socket');
const initSocketManager = require('./src/socket/socket.manager');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Wire up Socket event handlers
initSocketManager(io);

// Start Server Wrapper
const startServer = async () => {
  try {
    // 1. Connect to Database (MongoDB Atlas)
    await connectDB();

    // 2. Validate Redis connectivity
    const redisPing = await redis.ping();
    logger.info(`Redis Ping Response: ${redisPing}`);

    // 3. Start listening
    server.listen(PORT, () => {
      logger.info(`IntellMeet Backend Server running in [${process.env.NODE_ENV || 'development'}] mode on port: ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

// Start execution
startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}\nStack: ${err.stack}`);
  // Perform graceful exit in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}\nReason: ${reason}`);
});

// Graceful Shutdown Configuration (SIGTERM / SIGINT)
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal} signal. Initiating graceful shutdown...`);

  // Close HTTP Server first, refusing new connections
  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      // Disconnect Mongoose MongoDB Client
      await mongoose.connection.close();
      logger.info('MongoDB Atlas connection closed.');

      // Disconnect Redis Client
      await redis.quit();
      logger.info('Redis connection closed.');

      logger.info('Graceful shutdown completed successfully. Exiting process.');
      process.exit(0);
    } catch (err) {
      logger.error(`Error during connection teardown: ${err.message}`);
      process.exit(1);
    }
  });

  // Set timeout safeguard of 10s for forceful exit
  setTimeout(() => {
    logger.error('Forceful shutdown triggered after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
