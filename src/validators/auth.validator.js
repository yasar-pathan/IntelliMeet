const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 50 characters'
  }),
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email cannot be empty',
    'string.email': 'Please enter a valid email address'
  }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'Password cannot be empty',
    'string.min': 'Password must be at least 8 characters'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please enter a valid email address'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please enter a valid email address'
  })
});

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required().messages({
    'string.empty': 'Password cannot be empty',
    'string.min': 'Password must be at least 8 characters'
  }),
  confirmPassword: Joi.any().equal(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match'
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
