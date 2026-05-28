const Joi = require('joi');

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 50 characters'
  })
});

const preferencesSchema = Joi.object({
  notifications: Joi.boolean().messages({
    'boolean.base': 'Notifications preferences must be a boolean value'
  }),
  theme: Joi.string().valid('light', 'dark', 'system').messages({
    'any.only': 'Theme must be one of light, dark, or system'
  }),
  language: Joi.string().trim().messages({
    'string.empty': 'Language cannot be empty'
  })
}).min(1); // At least one field must be updated

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).required().messages({
    'string.empty': 'Search query cannot be empty',
    'string.min': 'Search query must be at least 2 characters'
  })
});

module.exports = {
  updateProfileSchema,
  preferencesSchema,
  searchQuerySchema
};
