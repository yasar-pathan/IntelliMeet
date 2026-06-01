const Meeting = require('../models/Meeting');
const Team = require('../models/Team');
const Task = require('../models/Task');
const User = require('../models/User');
const redis = require('../config/redis');
const meetingService = require('../services/meeting.service');
const geminiService = require('../services/gemini.service');
const notificationService = require('../services/notification.service');
const generateMeetingCode = require('../utils/meetingCode');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { getIO } = require('../config/socket');

// Helper to invalidate meeting-related Redis caches
const invalidateMeetingCaches = async (userId, meetingId) => {
  try {
    // Clear paginated lists caches (keys pattern)
    const keys = await redis.keys(`meetings:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    // Delete single meeting cache
    if (meetingId) {
      await redis.del(`meeting:details:${meetingId}`);
    }
  } catch (err) {
    logger.error(`Error invalidating meeting cache: ${err.message}`);
  }
};

/**
 * @route   POST /api/v1/meetings
 * @desc    Create a new meeting room
 * @access  Private
 * @body    { title, description, type, scheduledAt, settings, isPasswordProtected, password, team, agenda, tags }
 * @returns { ApiResponse } 201 Created status with meeting object
 */
const createMeeting = asyncHandler(async (req, res) => {
  const { 
    title, description, type, scheduledAt, settings, 
    isPasswordProtected, password, team, agenda, tags 
  } = req.body;
  const hostId = req.user._id;

  // Validate team membership if meeting is linked to a team
  if (team) {
    const teamDoc = await Team.findById(team);
    if (!teamDoc) {
      throw new ApiError(404, 'Team not found');
    }
    const isMember = teamDoc.members.some(m => m.user.toString() === hostId.toString());
    if (!isMember) {
      throw new ApiError(403, 'Forbidden: You must be a member of the team to schedule a meeting');
    }
  }

  // Generate meeting code
  let meetingCode = generateMeetingCode();
  let codeExists = await Meeting.findOne({ meetingCode });
  while (codeExists) {
    meetingCode = generateMeetingCode();
    codeExists = await Meeting.findOne({ meetingCode });
  }

  // Hash meeting password
  let hashedPassword = null;
  if (isPasswordProtected && password) {
    hashedPassword = await meetingService.hashMeetingPassword(password);
  }

  // Build settings
  const meetingSettings = {
    video: settings?.video !== undefined ? settings.video : true,
    audio: settings?.audio !== undefined ? settings.audio : true,
    chat: settings?.chat !== undefined ? settings.chat : true,
    recording: settings?.recording !== undefined ? settings.recording : false,
    waitingRoom: settings?.waitingRoom !== undefined ? settings.waitingRoom : false,
    maxParticipants: settings?.maxParticipants || 50
  };

  const meeting = await Meeting.create({
    title,
    description,
    meetingCode,
    host: hostId,
    type,
    scheduledAt: type === 'scheduled' ? scheduledAt : new Date(),
    settings: meetingSettings,
    isPasswordProtected,
    password: hashedPassword,
    team,
    agenda: agenda || [],
    tags: tags || [],
    participants: [{ user: hostId, role: 'host', joinedAt: new Date() }]
  });

  // Invalidate meeting lists cache
  await invalidateMeetingCaches(hostId);

  // Emit socket event to team if linked
  if (team) {
    try {
      const io = getIO();
      io.to(`team:${team}`).emit('meeting:created', { meetingId: meeting._id, title, meetingCode });
    } catch (sockErr) {
      logger.debug(`Socket emit skipped: ${sockErr.message}`);
    }
  }

  res.status(201).json(new ApiResponse(201, meeting, 'Meeting created successfully'));
});

/**
 * @route   GET /api/v1/meetings
 * @desc    Get paginated meetings list for requester
 * @access  Private
 * @query   { page, limit, status, type, team, startDate, endDate }
 * @returns { ApiResponse } 200 OK status with paginated list
 */
const getMeetings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const skip = (page - 1) * limit;

  // Filter building
  const filter = {
    $or: [
      { host: userId },
      { 'participants.user': userId }
    ]
  };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.team) filter.team = req.query.team;

  if (req.query.startDate || req.query.endDate) {
    filter.scheduledAt = {};
    if (req.query.startDate) filter.scheduledAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.scheduledAt.$lte = new Date(req.query.endDate);
  }

  // Cache checks
  const cacheFilterKey = JSON.stringify({ status: req.query.status, type: req.query.type, team: req.query.team, start: req.query.startDate, end: req.query.endDate });
  const redisKey = `meetings:${userId}:${page}:${limit}:${cacheFilterKey}`;

  const cachedResults = await redis.get(redisKey);
  if (cachedResults) {
    return res.status(200).json(new ApiResponse(200, JSON.parse(cachedResults), 'Meetings list retrieved (cached)'));
  }

  const sort =
    req.query.status === 'ended'
      ? { endedAt: -1, updatedAt: -1 }
      : { scheduledAt: -1, createdAt: -1 };

  const query = Meeting.find(filter)
    .populate('host', 'name avatar')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await Meeting.countDocuments(filter);
  const data = await query;
  
  const responseData = {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total
  };

  // Cache for 2 minutes (120 seconds)
  await redis.set(redisKey, JSON.stringify(responseData), 'EX', 120);

  res.status(200).json(new ApiResponse(200, responseData, 'Meetings list retrieved successfully'));
});

/**
 * @route   GET /api/v1/meetings/:meetingId
 * @desc    Get complete details of a single meeting room
 * @access  Private
 * @returns { ApiResponse } 200 OK status with detailed meeting doc
 */
const getMeetingById = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const redisKey = `meeting:details:${meetingId}`;
  const cachedData = await redis.get(redisKey);
  if (cachedData) {
    return res.status(200).json(new ApiResponse(200, JSON.parse(cachedData), 'Meeting details retrieved (cached)'));
  }

  const meeting = await Meeting.findById(meetingId)
    .populate('host', 'name avatar email')
    .populate('participants.user', 'name avatar email')
    .populate('actionItems')
    .populate('team', 'name');

  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  // Security check: only host, team members, or participants can view details
  const isParticipant = meeting.participants.some(p => p.user._id.toString() === userId.toString());
  const isHost = meeting.host._id.toString() === userId.toString();
  
  let isTeamMember = false;
  if (meeting.team) {
    const teamDoc = await Team.findById(meeting.team);
    isTeamMember = teamDoc?.members.some(m => m.user.toString() === userId.toString()) || false;
  }

  if (!isHost && !isParticipant && !isTeamMember) {
    throw new ApiError(403, 'Forbidden: You do not have permissions to view this meeting');
  }

  // Cache detail for 5 minutes
  await redis.set(redisKey, JSON.stringify(meeting), 'EX', 300);

  res.status(200).json(new ApiResponse(200, meeting, 'Meeting details retrieved successfully'));
});

/**
 * @route   GET /api/v1/meetings/code/:meetingCode
 * @desc    Get basic meeting details by 8-char code before joining
 * @access  Private
 * @returns { ApiResponse } 200 OK status with basic details
 */
const getMeetingByCode = asyncHandler(async (req, res) => {
  const { meetingCode } = req.params;

  const meeting = await Meeting.findOne({ meetingCode }, 'title host participants status isPasswordProtected settings')
    .populate('host', 'name avatar');

  if (!meeting) {
    throw new ApiError(404, 'Meeting not found with this code');
  }

  const basicInfo = {
    _id: meeting._id,
    title: meeting.title,
    host: meeting.host,
    status: meeting.status,
    participantCount: meeting.participants.length,
    isPasswordProtected: meeting.isPasswordProtected,
    settings: meeting.settings
  };

  res.status(200).json(new ApiResponse(200, basicInfo, 'Meeting code info found'));
});

/**
 * @route   POST /api/v1/meetings/:meetingId/join
 * @desc    Join a meeting and receive WebRTC TURN credentials
 * @access  Private
 * @body    { password }
 * @returns { ApiResponse } 200 OK status with meeting and TURN credentials
 */
const joinMeeting = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const { password } = req.body;
  const userId = req.user._id;

  const meeting = await Meeting.findById(meetingId).select('+password');
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  if (meeting.status === 'ended' || meeting.status === 'cancelled') {
    throw new ApiError(400, 'This meeting is no longer active');
  }

  // Verify password if protected (skip if host)
  if (meeting.isPasswordProtected && meeting.host.toString() !== userId.toString()) {
    const isMatched = await meetingService.verifyMeetingPassword(password, meeting.password);
    if (!isMatched) {
      throw new ApiError(401, 'Invalid password to join this meeting');
    }
  }

  // Check capacity limits
  const maxLimit = meeting.settings?.maxParticipants || 50;
  const currentCount = meeting.participants.filter(p => !p.leftAt).length;
  if (currentCount >= maxLimit) {
    throw new ApiError(400, 'Meeting capacity limit reached');
  }

  // Update meeting state to 'live' if it was scheduled
  if (meeting.status === 'scheduled') {
    meeting.status = 'live';
    meeting.startedAt = new Date();
  }

  // Upsert user inside participants list
  const existingPartIdx = meeting.participants.findIndex(p => p.user.toString() === userId.toString());
  if (existingPartIdx !== -1) {
    meeting.participants[existingPartIdx].leftAt = undefined;
    meeting.participants[existingPartIdx].joinedAt = new Date();
  } else {
    meeting.participants.push({
      user: userId,
      joinedAt: new Date(),
      role: meeting.host.toString() === userId.toString() ? 'host' : 'participant'
    });
  }

  await meeting.save();
  await invalidateMeetingCaches(userId, meetingId);

  // Generate TURN credentials
  const turnCredentials = meetingService.generateTurnCredentials(userId);

  // Emit socket update
  try {
    const io = getIO();
    io.to(`meeting:${meeting.meetingCode}`).emit('meeting:participant-joined', { userId, role: meeting.host.toString() === userId.toString() ? 'host' : 'participant' });
  } catch (sockErr) {
    logger.debug(`Socket joined broadcast skipped: ${sockErr.message}`);
  }

  const meetingResponse = meeting.toObject();
  delete meetingResponse.password;

  res.status(200).json(
    new ApiResponse(200, { meeting: meetingResponse, turnCredentials }, 'Successfully joined the meeting')
  );
});

/**
 * @route   POST /api/v1/meetings/:meetingId/leave
 * @desc    Leave a meeting, flush transcript, and trigger AI services when final participant exits
 * @access  Private
 * @returns { ApiResponse } 200 OK success message
 */
const leaveMeeting = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  const partIdx = meeting.participants.findIndex(p => p.user.toString() === userId.toString() && !p.leftAt);
  if (partIdx === -1) {
    throw new ApiError(400, 'You are not active in this meeting');
  }

  // Record leaving timestamp
  meeting.participants[partIdx].leftAt = new Date();

  // If host leaves and other active participants remain, we could assign co-host roles
  const activeParticipants = meeting.participants.filter(p => !p.leftAt);
  const isHost = meeting.host.toString() === userId.toString();

  if (isHost && activeParticipants.length > 0) {
    // Make the first active participant a co-host
    const firstActive = activeParticipants[0];
    const userToAssignIdx = meeting.participants.findIndex(p => p.user.toString() === firstActive.user.toString());
    if (userToAssignIdx !== -1) {
      meeting.participants[userToAssignIdx].role = 'co-host';
    }
  }

  // Check if this was the last active participant
  if (activeParticipants.length === 0) {
    meeting.status = 'ended';
    meeting.endedAt = new Date();
    
    // Calculate meeting duration in minutes
    const start = meeting.startedAt || meeting.createdAt;
    const end = meeting.endedAt;
    const diffMs = Math.abs(end - start);
    meeting.duration = Math.round(diffMs / (1000 * 60)); // rounded minutes
  }

  await meeting.save();
  await invalidateMeetingCaches(userId, meetingId);

  // Emit socket leave event
  try {
    const io = getIO();
    io.to(`meeting:${meeting.meetingCode}`).emit('meeting:participant-left', { userId });
  } catch (sockErr) {
    logger.debug(`Socket leave broadcast skipped: ${sockErr.message}`);
  }

  // If meeting transitioned to ended, trigger Redis transcript flushing + Async AI summarization
  if (meeting.status === 'ended') {
    // 1. Synchronously trigger Redis to Mongo transcript flush
    await meetingService.flushTranscriptToMongo(meetingId);
    
    // 2. Trigger asynchronous AI generation (Summaries and tasks) - Do NOT await!
    (async () => {
      try {
        const meetingWithTranscript = await Meeting.findById(meetingId);
        if (!meetingWithTranscript.transcript || meetingWithTranscript.transcript.trim() === '') {
          logger.info(`Skipped async AI generation for meeting ${meetingId} because transcript is empty.`);
          return;
        }

        logger.info(`Starting async AI summary extraction for meeting: ${meetingId}`);

        // Fetch participant names
        const participantUsers = await User.find({ _id: { $in: meetingWithTranscript.participants.map(p => p.user) } }, 'name');
        const participantNames = participantUsers.map(u => u.name);

        // a. Generate Summary
        const summaryResult = await geminiService.generateMeetingSummary(
          meetingWithTranscript.transcript,
          meetingWithTranscript.title,
          meetingWithTranscript.duration
        );

        meetingWithTranscript.aiSummary = {
          ...summaryResult,
          generatedAt: new Date()
        };

        // b. Extract and bulk-create Action Item Tasks
        const actionItems = await geminiService.extractActionItems(meetingWithTranscript.transcript, participantNames);
        if (actionItems && actionItems.length > 0) {
          const taskPromises = actionItems.map(async (item) => {
            // Find assignee ID matching names
            let assigneeId = null;
            const matchedUser = participantUsers.find(u => u.name.toLowerCase() === item.assignee.toLowerCase());
            if (matchedUser) {
              assigneeId = matchedUser._id;
            }

            const createdTask = await Task.create({
              title: item.title,
              description: item.description,
              meeting: meetingId,
              team: meetingWithTranscript.team,
              assignee: assigneeId,
              assignedBy: meetingWithTranscript.host,
              priority: item.priority || 'medium',
              dueDate: item.dueDate ? new Date(item.dueDate) : null,
              isAiGenerated: true
            });

            // Send notification to assignee
            if (assigneeId) {
              await notificationService.createAndSend({
                recipient: assigneeId,
                sender: meetingWithTranscript.host,
                type: 'task_assigned',
                title: 'New AI Task Assigned',
                message: `You have been assigned the task: "${item.title}" from the meeting "${meetingWithTranscript.title}".`,
                data: { taskId: createdTask._id, meetingId }
              });
            }

            return createdTask._id;
          });

          const createdTaskIds = await Promise.all(taskPromises);
          meetingWithTranscript.actionItems = createdTaskIds;
        }

        await meetingWithTranscript.save();
        await invalidateMeetingCaches(meetingWithTranscript.host, meetingId);

        // Notify participants that AI summary is ready
        try {
          const io = getIO();
          io.to(`meeting:${meetingWithTranscript.meetingCode}`).emit('ai:summary-ready', { meetingId });
        } catch (sErr) {}

        // Send push notification to all participants
        for (const p of meetingWithTranscript.participants) {
          await notificationService.createAndSend({
            recipient: p.user,
            sender: meetingWithTranscript.host,
            type: 'ai_summary_ready',
            title: 'Meeting Summary Ready',
            message: `AI Summary and Action Items for meeting "${meetingWithTranscript.title}" are now ready.`,
            data: { meetingId }
          });
        }

        logger.info(`Async AI summary extraction completed for meeting: ${meetingId}`);
      } catch (aiErr) {
        logger.error(`Failed during background AI summary processing for meeting ${meetingId}: ${aiErr.message}`);
      }
    })();
  }

  res.status(200).json(new ApiResponse(200, null, 'Successfully left the meeting'));
});

/**
 * @route   PATCH /api/v1/meetings/:meetingId
 * @desc    Update meeting properties (host only)
 * @access  Private (host only)
 * @returns { ApiResponse } 200 OK status with updated meeting doc
 */
const updateMeeting = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  // Ensure requester is host
  if (meeting.host.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden: Only the meeting host can modify settings');
  }

  const { title, description, scheduledAt, settings, agenda, tags } = req.body;

  if (title) meeting.title = title;
  if (description) meeting.description = description;
  if (scheduledAt) meeting.scheduledAt = scheduledAt;
  if (agenda) meeting.agenda = agenda;
  if (tags) meeting.tags = tags;
  if (settings) {
    meeting.settings = {
      ...meeting.settings,
      ...settings
    };
  }

  await meeting.save();
  await invalidateMeetingCaches(userId, meetingId);

  res.status(200).json(new ApiResponse(200, meeting, 'Meeting updated successfully'));
});

/**
 * @route   DELETE /api/v1/meetings/:meetingId
 * @desc    Cancel a meeting room (host only)
 * @access  Private (host only)
 * @returns { ApiResponse } 200 OK success message
 */
const deleteMeeting = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  // Ensure requester is host
  if (meeting.host.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden: Only the meeting host can cancel the meeting');
  }

  meeting.status = 'cancelled';
  await meeting.save();
  await invalidateMeetingCaches(userId, meetingId);

  // Send notifications to all participants
  const participantsList = meeting.participants.map(p => p.user);
  for (const participantId of participantsList) {
    if (participantId.toString() !== userId.toString()) {
      await notificationService.createAndSend({
        recipient: participantId,
        sender: userId,
        type: 'meeting_invite',
        title: 'Meeting Cancelled',
        message: `The meeting: "${meeting.title}" has been cancelled.`,
        data: { meetingId }
      });
    }
  }

  // Emit socket cancellation to room
  try {
    const io = getIO();
    io.to(`meeting:${meeting.meetingCode}`).emit('meeting:cancelled', { meetingId });
  } catch (sockErr) {}

  res.status(200).json(new ApiResponse(200, null, 'Meeting cancelled successfully'));
});

/**
 * @route   POST /api/v1/meetings/:meetingId/recording/start
 * @desc    Start recording (host only)
 * @access  Private (host only)
 * @returns { ApiResponse } 200 OK success message
 */
const startRecording = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  if (meeting.host.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden: Only host can start recording');
  }

  meeting.recording.isRecording = true;
  await meeting.save();
  await invalidateMeetingCaches(userId, meetingId);

  try {
    const io = getIO();
    io.to(`meeting:${meeting.meetingCode}`).emit('meeting:recording-started');
  } catch (sockErr) {}

  res.status(200).json(new ApiResponse(200, null, 'Meeting recording started'));
});

/**
 * @route   POST /api/v1/meetings/:meetingId/recording/stop
 * @desc    Stop recording and store file S3 reference (host only)
 * @access  Private (host only)
 * @body    { s3Key }
 * @returns { ApiResponse } 200 OK success message
 */
const stopRecording = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const { s3Key } = req.body;
  const userId = req.user._id;

  if (!s3Key) {
    throw new ApiError(400, 'S3 recording key is required');
  }

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  if (meeting.host.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden: Only host can stop recording');
  }

  const region = process.env.AWS_REGION || 'ap-south-1';
  const bucketName = process.env.AWS_S3_BUCKET_NAME || 'intellmeet-recordings';
  const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;

  meeting.recording.isRecording = false;
  meeting.recording.s3Key = s3Key;
  meeting.recording.s3Url = s3Url;
  await meeting.save();
  await invalidateMeetingCaches(userId, meetingId);

  // Notify participants of recording availability
  const participantsList = meeting.participants.map(p => p.user);
  for (const participantId of participantsList) {
    await notificationService.createAndSend({
      recipient: participantId,
      sender: userId,
      type: 'recording_ready',
      title: 'Meeting Recording Ready',
      message: `The recording for "${meeting.title}" is now available to download.`,
      data: { meetingId, s3Url }
    });
  }

  try {
    const io = getIO();
    io.to(`meeting:${meeting.meetingCode}`).emit('meeting:recording-stopped', { s3Url });
  } catch (sockErr) {}

  res.status(200).json(new ApiResponse(200, { s3Url }, 'Meeting recording stopped and saved'));
});

/**
 * @route   GET /api/v1/meetings/:meetingId/summary
 * @desc    Get AI Summary and generated action items (participants only)
 * @access  Private (participant only)
 * @returns { ApiResponse } 200 OK status with summary information
 */
const getMeetingSummary = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await Meeting.findById(meetingId)
    .populate('actionItems')
    .populate({
      path: 'actionItems',
      populate: { path: 'assignee', select: 'name avatar' }
    });

  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  const isParticipant = meeting.participants.some(p => p.user.toString() === userId.toString());
  const isHost = meeting.host.toString() === userId.toString();

  if (!isHost && !isParticipant) {
    throw new ApiError(403, 'Forbidden: Only meeting participants can view meeting summaries');
  }

  const result = {
    transcript: meeting.transcript || '',
    aiSummary: meeting.aiSummary || null,
    actionItems: meeting.actionItems || []
  };

  res.status(200).json(new ApiResponse(200, result, 'Meeting summary fetched successfully'));
});

module.exports = {
  createMeeting,
  getMeetings,
  getMeetingById,
  getMeetingByCode,
  joinMeeting,
  leaveMeeting,
  updateMeeting,
  deleteMeeting,
  startRecording,
  stopRecording,
  getMeetingSummary
};
