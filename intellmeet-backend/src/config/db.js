const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    logger.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  const maxRetries = 5;
  let retryCount = 0;

  const connectWithRetry = async () => {
    try {
      logger.info(`Attempting MongoDB connection (attempt ${retryCount + 1}/${maxRetries})...`);
      await mongoose.connect(mongoUri);
      logger.info('MongoDB Atlas connected successfully');
    } catch (err) {
      retryCount++;
      logger.error(`MongoDB connection failed: ${err.message}`);
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        logger.info(`Retrying MongoDB connection in ${delay / 1000} seconds...`);
        setTimeout(connectWithRetry, delay);
      } else {
        logger.error('Max MongoDB connection retries reached. Exiting process.');
        process.exit(1);
      }
    }
  };

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost. Attempting reconnect...');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err.message}`);
  });

  await connectWithRetry();
};

module.exports = connectDB;
