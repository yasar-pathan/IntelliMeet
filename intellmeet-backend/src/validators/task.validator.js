const Joi = require('joi');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createTaskSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Task title is required'
  }),
  description: Joi.string().trim().allow('').optional(),
  meeting: Joi.string().pattern(objectIdRegex).message('Invalid Meeting ID format').optional(),
  team: Joi.string().pattern(objectIdRegex).message('Invalid Team ID format').optional(),
  assignee: Joi.string().pattern(objectIdRegex).message('Invalid Assignee ID format').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  dueDate: Joi.date().optional()
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('').optional(),
  assignee: Joi.string().pattern(objectIdRegex).message('Invalid Assignee ID format').allow(null).optional(),
  status: Joi.string().valid('todo', 'in-progress', 'review', 'done', 'cancelled').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  dueDate: Joi.date().allow(null).optional()
}).min(1);

const reorderTaskItemSchema = Joi.object({
  taskId: Joi.string().pattern(objectIdRegex).required().messages({
    'string.pattern.base': 'Invalid Task ID format'
  }),
  order: Joi.number().integer().required(),
  status: Joi.string().valid('todo', 'in-progress', 'review', 'done', 'cancelled').required()
});

const reorderTasksSchema = Joi.object({
  tasks: Joi.array().items(reorderTaskItemSchema).required().messages({
    'any.required': 'Tasks array is required'
  })
});

const addCommentSchema = Joi.object({
  content: Joi.string().trim().required().messages({
    'string.empty': 'Comment content cannot be empty'
  })
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  reorderTasksSchema,
  addCommentSchema
};
