const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

const initSocket = (server) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173'];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  logger.info('Socket.io server initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized! Call initSocket first.');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO
};
