const Task = require('../models/Task');
const Team = require('../models/Team');
const taskService = require('../services/task.service');
const notificationService = require('../services/notification.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { getIO } = require('../config/socket');

// Helper to notify team sockets
const emitTaskSocketUpdate = (teamId, event, data) => {
  if (!teamId) return;
  try {
    const io = getIO();
    io.to(`team:${teamId}`).emit(event, data);
  } catch (err) {}
};

const getUserTeamIds = async (userId) => {
  const teams = await Team.find({ 'members.user': userId }).select('_id');
  return teams.map((team) => team._id.toString());
};

const ensureTeamAccess = async (teamId, userId) => {
  if (!teamId) return null;
  const teamDoc = await Team.findById(teamId).select('members');
  if (!teamDoc) {
    throw new ApiError(404, 'Team not found');
  }
  const isMember = teamDoc.members.some((m) => m.user.toString() === userId.toString());
  if (!isMember) {
    throw new ApiError(403, 'Forbidden: You are not a member of this team');
  }
  return teamDoc;
};

const assertTaskAccess = async (task, userId) => {
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  const isAssignee = task.assignee && task.assignee.toString() === userId.toString();
  const isAssigner = task.assignedBy && task.assignedBy.toString() === userId.toString();
  if (isAssignee || isAssigner) {
    return;
  }

  if (task.team) {
    await ensureTeamAccess(task.team, userId);
    return;
  }

  throw new ApiError(403, 'Forbidden: You do not have access to this task');
};

/**
 * @route   GET /api/v1/tasks
 * @desc    Get paginated tasks list matching query filters
 * @access  Private
 * @query   { page, limit, assignee, status, priority, team, meeting, startDueDate, endDueDate }
 * @returns { ApiResponse } 200 OK status with tasks list
 */
const getTasks = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const skip = (page - 1) * limit;
  const userTeamIds = await getUserTeamIds(userId);

  const filter = {
    $or: [
      { assignedBy: userId },
      { assignee: userId },
      ...(userTeamIds.length > 0 ? [{ team: { $in: userTeamIds } }] : [])
    ]
  };

  if (req.query.team) {
    if (!userTeamIds.includes(req.query.team)) {
      throw new ApiError(403, 'Forbidden: You are not a member of this team');
    }
    filter.team = req.query.team;
  }

  if (req.query.assignee === 'unassigned') {
    filter.assignee = null;
  } else if (req.query.assignee) {
    filter.assignee = req.query.assignee;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.meeting) filter.meeting = req.query.meeting;

  if (req.query.startDueDate || req.query.endDueDate) {
    filter.dueDate = {};
    if (req.query.startDueDate) filter.dueDate.$gte = new Date(req.query.startDueDate);
    if (req.query.endDueDate) filter.dueDate.$lte = new Date(req.query.endDueDate);
  }

  const tasks = await Task.find(filter)
    .populate('assignee', 'name avatar email')
    .populate('assignedBy', 'name avatar')
    .sort({ order: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Task.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      data: tasks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total
    }, 'Tasks retrieved successfully')
  );
});

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task and notify assignee
 * @access  Private
 * @body    { title, description, meeting, team, assignee, priority, dueDate }
 * @returns { ApiResponse } 201 Created status with new task
 */
const createTask = asyncHandler(async (req, res) => {
  const { title, description, meeting, team, assignee, priority, dueDate } = req.body;
  const assignedBy = req.user._id;

  // Validate team membership if linked to team
  if (team) {
    const teamDoc = await ensureTeamAccess(team, assignedBy);
    if (assignee) {
      const assigneeInTeam = teamDoc.members.some((member) => member.user.toString() === assignee.toString());
      if (!assigneeInTeam) {
        throw new ApiError(400, 'Assignee must be a member of the selected team');
      }
    }
  } else if (assignee && assignee.toString() !== assignedBy.toString()) {
    throw new ApiError(400, 'Standalone tasks can only be assigned to yourself');
  }

  // Get next order index for Kanban position
  const orderCount = await Task.countDocuments({ team, status: 'todo' });

  const resolvedAssignee = assignee || (!team ? assignedBy : undefined);

  const task = await Task.create({
    title,
    description,
    meeting,
    team,
    assignee: resolvedAssignee,
    assignedBy,
    priority,
    dueDate,
    order: orderCount
  });

  const populatedTask = await Task.findById(task._id)
    .populate('assignee', 'name avatar')
    .populate('assignedBy', 'name avatar');

  // Trigger notification if assignee exists
  if (resolvedAssignee && resolvedAssignee.toString() !== assignedBy.toString()) {
    await notificationService.createAndSend({
      recipient: resolvedAssignee,
      sender: assignedBy,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned the task: "${title}".`,
      data: { taskId: task._id }
    });
  }

  emitTaskSocketUpdate(team, 'task:updated', populatedTask);

  res.status(201).json(new ApiResponse(201, populatedTask, 'Task created successfully'));
});

/**
 * @route   GET /api/v1/tasks/:taskId
 * @desc    Retrieve details of a single task
 * @access  Private
 * @returns { ApiResponse } 200 OK status with populated task details
 */
const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user._id;

  const task = await Task.findById(taskId)
    .populate('assignee', 'name avatar email')
    .populate('assignedBy', 'name avatar')
    .populate('comments.user', 'name avatar')
    .populate('meeting', 'title meetingCode');

  await assertTaskAccess(task, userId);

  res.status(200).json(new ApiResponse(200, task, 'Task details retrieved'));
});

/**
 * @route   PATCH /api/v1/tasks/:taskId
 * @desc    Update task details (assignee, priority, dueDate, title, description, status)
 * @access  Private
 * @returns { ApiResponse } 200 OK status with updated task
 */
const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title, description, assignee, status, priority, dueDate } = req.body;
  const userId = req.user._id;

  const task = await Task.findById(taskId);
  await assertTaskAccess(task, userId);

  const oldAssignee = task.assignee;

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (status !== undefined) {
    task.status = status;
    if (status === 'done') {
      task.completedAt = new Date();
    } else {
      task.completedAt = undefined;
    }
  }

  if (assignee !== undefined) {
    if (task.team) {
      const teamDoc = await ensureTeamAccess(task.team, userId);
      const assigneeInTeam = teamDoc.members.some((member) => member.user.toString() === assignee.toString());
      if (!assigneeInTeam) {
        throw new ApiError(400, 'Assignee must be a member of this task team');
      }
    } else if (assignee.toString() !== userId.toString()) {
      throw new ApiError(400, 'Standalone tasks can only be assigned to yourself');
    }
    task.assignee = assignee;
  }

  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('assignee', 'name avatar')
    .populate('assignedBy', 'name avatar');

  // Notify new assignee if changed
  if (assignee && (!oldAssignee || oldAssignee.toString() !== assignee.toString()) && assignee.toString() !== userId.toString()) {
    await notificationService.createAndSend({
      recipient: assignee,
      sender: userId,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned the task: "${task.title}".`,
      data: { taskId: task._id }
    });
  }

  emitTaskSocketUpdate(task.team, 'task:updated', populatedTask);

  res.status(200).json(new ApiResponse(200, populatedTask, 'Task updated successfully'));
});

/**
 * @route   DELETE /api/v1/tasks/:taskId
 * @desc    Soft-delete task by setting status to cancelled
 * @access  Private
 * @returns { ApiResponse } 200 OK success message
 */
const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user._id;

  const task = await Task.findById(taskId);
  await assertTaskAccess(task, userId);

  task.status = 'cancelled';
  await task.save();

  emitTaskSocketUpdate(task.team, 'task:deleted', { taskId });

  res.status(200).json(new ApiResponse(200, null, 'Task soft deleted successfully'));
});

/**
 * @route   PATCH /api/v1/tasks/:taskId/status
 * @desc    Quick status change endpoint for drag-and-drop actions
 * @access  Private
 * @body    { status }
 * @returns { ApiResponse } 200 OK status with updated task
 */
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const userId = req.user._id;

  const task = await Task.findById(taskId);
  await assertTaskAccess(task, userId);

  task.status = status;
  if (status === 'done') {
    task.completedAt = new Date();
  } else {
    task.completedAt = undefined;
  }
  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('assignee', 'name avatar')
    .populate('assignedBy', 'name avatar');

  emitTaskSocketUpdate(task.team, 'task:updated', populatedTask);

  res.status(200).json(new ApiResponse(200, populatedTask, 'Task status updated'));
});

/**
 * @route   POST /api/v1/tasks/:taskId/comments
 * @desc    Add comment to a task
 * @access  Private
 * @body    { content }
 * @returns { ApiResponse } 200 OK status with updated task
 */
const addTaskComment = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  const task = await Task.findById(taskId);
  await assertTaskAccess(task, userId);

  task.comments.push({
    user: userId,
    content: content,
    createdAt: new Date()
  });

  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('comments.user', 'name avatar')
    .populate('assignee', 'name avatar')
    .populate('assignedBy', 'name avatar');

  // If there's an assignee, notify them of comment
  if (task.assignee && task.assignee.toString() !== userId.toString()) {
    await notificationService.createAndSend({
      recipient: task.assignee,
      sender: userId,
      type: 'mention',
      title: 'New Task Comment',
      message: `${req.user.name} commented on task "${task.title}".`,
      data: { taskId: task._id }
    });
  }

  emitTaskSocketUpdate(task.team, 'task:updated', populatedTask);

  res.status(200).json(new ApiResponse(200, populatedTask, 'Comment added successfully'));
});

/**
 * @route   PATCH /api/v1/tasks/reorder
 * @desc    Bulk reorder tasks inside Kanban layout
 * @access  Private
 * @body    { tasks: [{ taskId, order, status }] }
 * @returns { ApiResponse } 200 OK success message
 */
const reorderTasksEndpoint = asyncHandler(async (req, res) => {
  const { tasks } = req.body;
  const userId = req.user._id;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new ApiError(400, 'Tasks payload cannot be empty');
  }

  const taskIds = tasks.map((entry) => entry.taskId);
  const existingTasks = await Task.find({ _id: { $in: taskIds } }).select('_id team assignee assignedBy');
  if (existingTasks.length !== taskIds.length) {
    throw new ApiError(404, 'One or more tasks were not found');
  }

  for (const task of existingTasks) {
    await assertTaskAccess(task, userId);
  }

  await taskService.reorderTasks(tasks);

  // Emit refresh notification to team
  if (tasks.length > 0) {
    try {
      const sampleTask = await Task.findById(tasks[0].taskId);
      if (sampleTask && sampleTask.team) {
        emitTaskSocketUpdate(sampleTask.team, 'tasks:reordered', { teamId: sampleTask.team });
      }
    } catch (e) {}
  }

  res.status(200).json(new ApiResponse(200, null, 'Tasks reordered successfully'));
});

module.exports = {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  addTaskComment,
  reorderTasks: reorderTasksEndpoint
};
