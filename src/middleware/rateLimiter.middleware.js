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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: createRedisStore('global'),
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: customHandler
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  message: 'Too many authentication attempts, please try again after 15 minutes',
  handler: customHandler
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 AI requests per window
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

