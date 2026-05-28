const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redis = require('../config/redis');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

const verifyJWT = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(401, 'Unauthorized access: No token provided');
  }

  // Check if token is blacklisted in Redis
  const isBlacklisted = await redis.get(`blacklist:${token}`);
  if (isBlacklisted) {
    throw new ApiError(401, 'Unauthorized access: Token has been revoked');
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded._id;

    // Check Redis session cache
    let cachedUser = await redis.get(`session:${userId}`);
    let user;

    if (cachedUser) {
      user = JSON.parse(cachedUser);
    } else {
      user = await User.findById(userId).lean();
      if (!user) {
        throw new ApiError(401, 'Unauthorized access: User not found');
      }

      // Check soft-delete status
      if (user.isActive === false) {
        throw new ApiError(401, 'Unauthorized access: Account is inactive');
      }

      // Cache session in Redis for 15 minutes (900 seconds)
      await redis.set(`session:${userId}`, JSON.stringify(user), 'EX', 900);
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error(`JWT Verification Error: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    }
    throw new ApiError(401, 'Invalid token');
  }
});

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, `Forbidden: Requester role '${req.user?.role || 'none'}' is not authorized for this resource`);
    }
    next();
  };
};

module.exports = {
  verifyJWT,
  requireRole
};
