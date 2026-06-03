const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    logger.info(`Redis reconnecting... attempt ${times}, delaying ${delay}ms`);
    return delay;
  }
});

redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('error', (err) => {
  logger.error(`Redis Client Error: ${err.message}`);
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});

module.exports = redis;
