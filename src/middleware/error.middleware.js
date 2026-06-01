const Sentry = require('@sentry/node');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.errors = err.errors || [];

  // Log error using winston
  logger.error(`${err.message} - ${req.method} ${req.originalUrl} - IP: ${req.ip} \nStack: ${err.stack}`);

  // Report to Sentry in production if configured
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }

  // Handle Mongoose CastError (Invalid Object ID)
  if (err.name === 'CastError') {
    const message = `Invalid ID format for path: ${err.path}`;
    error = new ApiError(400, message);
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    const fieldErrors = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key].message
    }));
    error = new ApiError(400, `Validation Error: ${message}`, fieldErrors);
  }

  // Handle Mongoose duplicate key (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate field value entered for ${field}`;
    error = new ApiError(409, message);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Token expired');
  }

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const isRecordingUpload = req.originalUrl && req.originalUrl.includes('/recording/upload');
    error = new ApiError(
      400,
      isRecordingUpload
        ? 'Recording file exceeds the 100MB upload limit'
        : 'File upload size limit exceeded (max 10MB)'
    );
  }
  if (err.message && err.message.includes('multer')) {
    error = new ApiError(400, err.message);
  }
  if (err.message && err.message.includes('Recording format not allowed')) {
    error = new ApiError(400, err.message);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorMiddleware;
