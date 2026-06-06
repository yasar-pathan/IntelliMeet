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
const redis = require('../config/redis');

const setAiProcessingStatus = async (meeting, updates) => {
  meeting.aiProcessing = {
    ...(meeting.aiProcessing || {}),
    ...updates,
  };
  await meeting.save();
};

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

  let currentTranscript = meeting.transcript || '';
  if (meeting.status === 'live' || meeting.status === 'scheduled') {
    const liveTranscript = await redis.get(`transcript:${meetingId}`);
    if (liveTranscript) currentTranscript = liveTranscript;
  }

  if (!currentTranscript || currentTranscript.trim() === '') {
    throw new ApiError(400, 'Cannot summarize a meeting with no transcript. Start the meeting and capture transcript chunks first.');
  }

  // Retrieve participant names
  const participantUsers = await User.find({ _id: { $in: meeting.participants.map(p => p.user) } }, 'name');
  const participantNames = participantUsers.map(u => u.name);

  logger.info(`Manual AI summary execution requested for meeting: ${meetingId}`);
  await setAiProcessingStatus(meeting, {
    status: 'processing',
    lastRunAt: new Date(),
    error: null,
  });

  try {
    // 1. Generate summary
    const summaryResult = await geminiService.generateMeetingSummary(
      currentTranscript,
      meeting.title,
      meeting.duration || 1
    );

    meeting.aiSummary = {
      ...summaryResult,
      generatedAt: new Date()
    };

    // 2. Extract action items and create Tasks
    const actionItems = await geminiService.extractActionItems(currentTranscript, participantNames);
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

    await setAiProcessingStatus(meeting, {
      status: 'completed',
      lastSuccessAt: new Date(),
      retryCount: 0,
      error: null,
    });

    // Socket notification
    try {
      const io = getIO();
      io.to(`meeting:${meeting.meetingCode}`).emit('ai:summary-ready', { meetingId });
    } catch (sockErr) {}

    res.status(200).json(
      new ApiResponse(200, { summary: meeting.aiSummary, tasks: createdTasks }, 'Meeting summary generated successfully')
    );
  } catch (error) {
    await Meeting.findByIdAndUpdate(meetingId, {
      $set: {
        'aiProcessing.status': 'failed',
        'aiProcessing.error': error.message,
      },
      $inc: { 'aiProcessing.retryCount': 1 },
    });
    throw error;
  }
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

  let currentTranscript = meeting.transcript || '';
  if (meeting.status === 'live' || meeting.status === 'scheduled') {
    const liveTranscript = await redis.get(`transcript:${meetingId}`);
    if (liveTranscript) currentTranscript = liveTranscript;
  }

  await setAiProcessingStatus(meeting, {
    status: 'processing',
    lastRunAt: new Date(),
    error: null,
  });

  if (!currentTranscript || currentTranscript.trim() === '') {
    throw new ApiError(400, 'Cannot extract action items from a meeting with no transcript.');
  }

  const participantUsers = await User.find({ _id: { $in: meeting.participants.map(p => p.user) } }, 'name');
  const participantNames = participantUsers.map(u => u.name);

  const actionItems = await geminiService.extractActionItems(currentTranscript, participantNames);
  const createdTasks = [];

  try {
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

    await setAiProcessingStatus(meeting, {
      status: 'completed',
      lastSuccessAt: new Date(),
      retryCount: 0,
      error: null,
    });

    res.status(200).json(
      new ApiResponse(200, createdTasks, 'Action items extracted successfully')
    );
  } catch (error) {
    await Meeting.findByIdAndUpdate(meetingId, {
      $set: {
        'aiProcessing.status': 'failed',
        'aiProcessing.error': error.message,
      },
      $inc: { 'aiProcessing.retryCount': 1 },
    });
    throw error;
  }
});

const getAiProcessingStatus = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await assertMeetingParticipant(meetingId, userId);
  const status = meeting.aiProcessing || { status: 'idle', retryCount: 0 };

  res.status(200).json(
    new ApiResponse(200, status, 'AI processing status fetched successfully')
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

const MeetingAiChat = require('../models/MeetingAiChat');

/**
 * @route   POST /api/v1/ai/meeting-chat/:meetingId
 * @desc    Ask AI a question about the meeting
 * @access  Private (participant only)
 */
const askQuestion = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const { question } = req.body;
  const userId = req.user._id;

  if (!question || question.trim() === '') {
    throw new ApiError(400, 'Question cannot be empty');
  }

  const meeting = await assertMeetingParticipant(meetingId, userId);

  let currentTranscript = meeting.transcript || '';
  if (meeting.status === 'live' || meeting.status === 'scheduled') {
    const liveTranscript = await redis.get(`transcript:${meetingId}`);
    if (liveTranscript) currentTranscript = liveTranscript;
  }

  const answer = await geminiService.answerMeetingQuestion(currentTranscript, question);

  const chatMessage = await MeetingAiChat.create({
    meeting: meetingId,
    user: userId,
    question,
    answer
  });

  res.status(200).json(
    new ApiResponse(200, { answer, chatMessage }, 'Question answered successfully')
  );
});

/**
 * @route   GET /api/v1/ai/meeting-chat/:meetingId
 * @desc    Get AI chat history for a meeting
 * @access  Private (participant only)
 */
const getChatHistory = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  await assertMeetingParticipant(meetingId, userId);

  const history = await MeetingAiChat.find({ meeting: meetingId })
    .sort({ createdAt: 1 })
    .select('-__v');

  res.status(200).json(
    new ApiResponse(200, history, 'Chat history fetched successfully')
  );
});

module.exports = {
  summarizeMeeting,
  extractActions,
  generateAgenda,
  getProductivityAnalysis,
  getAiProcessingStatus,
  askQuestion,
  getChatHistory
};
