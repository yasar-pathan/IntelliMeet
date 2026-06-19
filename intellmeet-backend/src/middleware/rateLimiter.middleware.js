const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
const redisClient = require('../config/redis');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const createRedisStore = (prefix) => {
  try {
    return new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: `rl:${prefix}:`
    });
  } catch (err) {
    logger.error(`Error initializing RedisStore for ${prefix} rate limiter: ${err.message}`);
    return undefined;
  }
};

const customHandler = (req, res, next, options) => {
  next(new ApiError(429, options.message));
};

const passThroughLimiter = (_req, _res, next) => next();
const isTestEnv = process.env.NODE_ENV === 'test';

const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 10) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX, 10) || 300, // Default: 300 requests (increased from 100 to handle multi-user/NAT setups)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: createRedisStore('global'),
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: customHandler
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 100, // Default: 100 auth attempts (increased from 10 to support multiple users behind NAT / team testing)
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  message: 'Too many authentication attempts, please try again after 15 minutes',
  handler: customHandler
});

const aiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS, 10) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AI_MAX, 10) || 50, // Default: 50 AI requests (increased from 20)
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('ai'),
  message: 'Too many AI analysis requests, please try again after 15 minutes',
  handler: customHandler
});

module.exports = {
  globalLimiter: isTestEnv ? passThroughLimiter : globalLimiter,
  authLimiter: isTestEnv ? passThroughLimiter : authLimiter,
  aiLimiter: isTestEnv ? passThroughLimiter : aiLimiter
};

