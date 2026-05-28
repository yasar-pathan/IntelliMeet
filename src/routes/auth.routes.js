const express = require('express');
const authController = require('../controllers/auth.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} = require('../validators/auth.validator');

const router = express.Router();

// Public routes with specific auth rate limiter
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Token-only/Callback public routes
router.post('/verify-email', authController.verifyEmail);
router.post('/refresh-token', authController.refreshToken);

// Private routes
router.post('/logout', verifyJWT, authController.logout);
router.get('/me', verifyJWT, authController.me);

module.exports = router;
