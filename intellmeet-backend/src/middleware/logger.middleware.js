const morgan = require('morgan');
const logger = require('../utils/logger');

// Define stream object with a write function that directs logs to our winston logger
const stream = {
  write: (message) => {
    // Trim the message to remove double newlines morgan appends
    logger.http(message.trim());
  }
};

// Check process environment for Morgan log format
const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

// Set up morgan middleware with the stream
const morganMiddleware = morgan(format, { stream });

module.exports = morganMiddleware;
