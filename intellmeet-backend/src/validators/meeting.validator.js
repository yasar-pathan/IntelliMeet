const Joi = require('joi');

const settingsSchema = Joi.object({
  video: Joi.boolean().default(true),
  audio: Joi.boolean().default(true),
  chat: Joi.boolean().default(true),
  recording: Joi.boolean().default(false),
  waitingRoom: Joi.boolean().default(false),
  maxParticipants: Joi.number().integer().min(2).max(100).default(50)
});

const createMeetingSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Meeting title is required'
  }),
  description: Joi.string().trim().allow('').optional(),
  type: Joi.string().valid('instant', 'scheduled', 'recurring').default('instant'),
  scheduledAt: Joi.date().when('type', {
    is: 'scheduled',
    then: Joi.required().messages({
      'any.required': 'scheduledAt is required for a scheduled meeting'
    }),
    otherwise: Joi.optional()
  }),
  settings: settingsSchema.optional(),
  team: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid Team ID format').optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  agenda: Joi.array().items(Joi.string().trim()).optional(),
  isPasswordProtected: Joi.boolean().default(false),
  password: Joi.string().allow('').when('isPasswordProtected', {
    is: true,
    then: Joi.string().required().invalid('').messages({
      'any.required': 'Password is required when password protection is enabled',
      'any.invalid': 'Password cannot be empty when password protection is enabled'
    }),
    otherwise: Joi.forbidden().messages({
      'any.unknown': 'Password field should not be provided unless password protection is enabled'
    })
  })
});

const updateMeetingSchema = Joi.object({
  title: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('').optional(),
  scheduledAt: Joi.date().optional(),
  settings: settingsSchema.optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  agenda: Joi.array().items(Joi.string().trim()).optional()
}).min(1); // At least one field must be updated

const joinMeetingSchema = Joi.object({
  password: Joi.string().trim().allow('').optional()
});

module.exports = {
  createMeetingSchema,
  updateMeetingSchema,
  joinMeetingSchema
};
