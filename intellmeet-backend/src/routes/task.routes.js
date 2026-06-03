const express = require('express');
const taskController = require('../controllers/task.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { 
  createTaskSchema, 
  updateTaskSchema, 
  reorderTasksSchema, 
  addCommentSchema 
} = require('../validators/task.validator');

const router = express.Router();

// Apply JWT verification to all task routes
router.use(verifyJWT);

// Task collection endpoints
router.get('/', taskController.getTasks);
router.post('/', validate(createTaskSchema), taskController.createTask);

// Kanban bulk reorder endpoint
router.patch('/reorder', validate(reorderTasksSchema), taskController.reorderTasks);

// Single task endpoints
router.get('/:taskId', taskController.getTaskById);
router.patch('/:taskId', validate(updateTaskSchema), taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);

// Task comments & status updates
router.patch('/:taskId/status', taskController.updateTaskStatus);
router.post('/:taskId/comments', validate(addCommentSchema), taskController.addTaskComment);

module.exports = router;
