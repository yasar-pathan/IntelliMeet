const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const User = require('../models/User');
const Message = require('../models/Message');
const geminiService = require('../services/gemini.service');
const notificationService = require('../services/notification.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { getIO } = require('../config/socket');

/**
 * Helper to assert if user is participant/host of the meeting
 */
const assertMeetingParticipant = async (meetingId, userId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }
  const isParticipant = meeting.participants.some(p => p.user.toString() === userId.toString());
  const isHost = meeting.host.toString() === userId.toString();
  if (!isHost && !isParticipant) {
    throw new ApiError(403, 'Forbidden: You must be a participant of the meeting to perform this AI operation');
  }
  return meeting;
};

/**
 * @route   POST /api/v1/ai/summarize/:meetingId
 * @desc    Manually trigger AI summarization and action items extraction
 * @access  Private (participant only)
 * @returns { ApiResponse } 200 OK status with summary results
 */
const summarizeMeeting = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await assertMeetingParticipant(meetingId, userId);

  if (!meeting.transcript || meeting.transcript.trim() === '') {
    throw new ApiError(400, 'Cannot summarize a meeting with no transcript. Start the meeting and capture transcript chunks first.');
  }

  // Retrieve participant names
  const participantUsers = await User.find({ _id: { $in: meeting.participants.map(p => p.user) } }, 'name');
  const participantNames = participantUsers.map(u => u.name);

  logger.info(`Manual AI summary execution requested for meeting: ${meetingId}`);

  // 1. Generate summary
  const summaryResult = await geminiService.generateMeetingSummary(
    meeting.transcript,
    meeting.title,
    meeting.duration || 1
  );

  meeting.aiSummary = {
    ...summaryResult,
    generatedAt: new Date()
  };

  // 2. Extract action items and create Tasks
  const actionItems = await geminiService.extractActionItems(meeting.transcript, participantNames);
  const createdTasks = [];

  if (actionItems && actionItems.length > 0) {
    const taskPromises = actionItems.map(async (item) => {
      let assigneeId = null;
      const matchedUser = participantUsers.find(u => u.name.toLowerCase() === item.assignee.toLowerCase());
      if (matchedUser) {
        assigneeId = matchedUser._id;
      }

      const task = await Task.create({
        title: item.title,
        description: item.description,
        meeting: meetingId,
        team: meeting.team,
        assignee: assigneeId,
        assignedBy: meeting.host,
        priority: item.priority || 'medium',
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
        isAiGenerated: true
      });

      createdTasks.push(task);

      if (assigneeId) {
        await notificationService.createAndSend({
          recipient: assigneeId,
          sender: meeting.host,
          type: 'task_assigned',
          title: 'New Task Assigned from Meeting',
          message: `Task "${item.title}" assigned by ${req.user.name} from meeting "${meeting.title}".`,
          data: { taskId: task._id, meetingId }
        });
      }

      return task._id;
    });

    const taskIds = await Promise.all(taskPromises);
    meeting.actionItems = taskIds;
  }

  await meeting.save();

  // Socket notification
  try {
    const io = getIO();
    io.to(`meeting:${meeting.meetingCode}`).emit('ai:summary-ready', { meetingId });
  } catch (sockErr) {}

  res.status(200).json(
    new ApiResponse(200, { summary: meeting.aiSummary, tasks: createdTasks }, 'Meeting summary generated successfully')
  );
});

/**
 * @route   POST /api/v1/ai/extract-actions/:meetingId
 * @desc    Manually extract tasks from meeting transcript (without overriding summary)
 * @access  Private (participant only)
 * @returns { ApiResponse } 200 OK status with created tasks
 */
const extractActions = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await assertMeetingParticipant(meetingId, userId);

  if (!meeting.transcript || meeting.transcript.trim() === '') {
    throw new ApiError(400, 'Cannot extract action items from a meeting with no transcript.');
  }

  const participantUsers = await User.find({ _id: { $in: meeting.participants.map(p => p.user) } }, 'name');
  const participantNames = participantUsers.map(u => u.name);

  const actionItems = await geminiService.extractActionItems(meeting.transcript, participantNames);
  const createdTasks = [];

  for (const item of actionItems) {
    let assigneeId = null;
    const matchedUser = participantUsers.find(u => u.name.toLowerCase() === item.assignee.toLowerCase());
    if (matchedUser) {
      assigneeId = matchedUser._id;
    }

    const task = await Task.create({
      title: item.title,
      description: item.description,
      meeting: meetingId,
      team: meeting.team,
      assignee: assigneeId,
      assignedBy: meeting.host,
      priority: item.priority || 'medium',
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      isAiGenerated: true
    });

    createdTasks.push(task);

    // Link task to meeting array
    meeting.actionItems.push(task._id);

    if (assigneeId) {
      await notificationService.createAndSend({
        recipient: assigneeId,
        sender: meeting.host,
        type: 'task_assigned',
        title: 'New AI Action Assigned',
        message: `Task: "${item.title}" assigned to you from meeting "${meeting.title}"`,
        data: { taskId: task._id, meetingId }
      });
    }
  }

  await meeting.save();

  res.status(200).json(
    new ApiResponse(200, createdTasks, 'Action items extracted successfully')
  );
});

/**
 * @route   POST /api/v1/ai/generate-agenda
 * @desc    Generate suggested agenda items with time allocations based on metadata
 * @access  Private
 * @body    { title, description, duration, teamContext }
 * @returns { ApiResponse } 200 OK status with agenda list
 */
const generateAgenda = asyncHandler(async (req, res) => {
  const { title, description, duration, teamContext } = req.body;

  const agenda = await geminiService.generateMeetingAgenda(
    title,
    description || '',
    duration || 30,
    teamContext || ''
  );

  res.status(200).json(
    new ApiResponse(200, agenda, 'Agenda suggestions generated successfully')
  );
});

/**
 * @route   GET /api/v1/ai/productivity/:meetingId
 * @desc    Analyze meeting productivity metrics via Gemini
 * @access  Private (participant only)
 * @returns { ApiResponse } 200 OK status with productivity score and analysis
 */
const getProductivityAnalysis = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await assertMeetingParticipant(meetingId, userId);

  // Gathers metrics
  const duration = meeting.duration || 1;
  const participantCount = meeting.participants.length;
  const actionItemsCount = meeting.actionItems.length;
  const chatCount = await Message.countDocuments({ meeting: meetingId });

  const analysis = await geminiService.analyzeMeetingProductivity({
    duration,
    participantCount,
    actionItemsCount,
    chatCount
  });

  res.status(200).json(
    new ApiResponse(200, analysis, 'Productivity analysis fetched successfully')
  );
});

module.exports = {
  summarizeMeeting,
  extractActions,
  generateAgenda,
  getProductivityAnalysis
};
