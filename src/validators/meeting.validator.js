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
  password: Joi.string().when('isPasswordProtected', {
    is: true,
    then: Joi.required().messages({
      'any.required': 'password is required when the meeting is password protected'
    }),
    otherwise: Joi.forbidden().messages({
      'any.unknown': 'password is not allowed if meeting is not password protected'
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
