const Joi = require('joi');

const teamSettingsSchema = Joi.object({
  isPublic: Joi.boolean().default(false),
  allowMemberInvite: Joi.boolean().default(true)
});

const createTeamSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Team name is required'
  }),
  description: Joi.string().trim().allow('').optional(),
  settings: teamSettingsSchema.optional()
});

const updateTeamSchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('').optional(),
  settings: teamSettingsSchema.optional()
}).min(1);

const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid('owner', 'admin', 'member').required().messages({
    'any.only': 'Role must be one of owner, admin, or member'
  })
});

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  updateMemberRoleSchema
};
