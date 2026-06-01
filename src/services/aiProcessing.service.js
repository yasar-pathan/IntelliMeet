const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const User = require('../models/User');
const redis = require('../config/redis');
const geminiService = require('./gemini.service');
const notificationService = require('./notification.service');
const logger = require('../utils/logger');
const { getIO } = require('../config/socket');

const invalidateMeetingCaches = async (hostId, meetingId) => {
  try {
    const keys = await redis.keys(`meetings:${hostId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.del(`meeting:details:${meetingId}`);
  } catch (err) {
    logger.error(`AI processing cache invalidation failed: ${err.message}`);
  }
};

const queueMeetingIntelligence = async (meetingId) => {
  await Meeting.findByIdAndUpdate(meetingId, {
    $set: {
      'aiProcessing.status': 'queued',
      'aiProcessing.lastRunAt': new Date(),
      'aiProcessing.error': null,
    },
  });

  setTimeout(() => {
    processMeetingIntelligence(meetingId).catch((err) => {
      logger.error(`Queued AI processing failed for ${meetingId}: ${err.message}`);
    });
  }, 0);
};

const processMeetingIntelligence = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    logger.warn(`Skipping AI processing: meeting ${meetingId} not found.`);
    return null;
  }

  try {
    meeting.aiProcessing = {
      ...(meeting.aiProcessing || {}),
      status: 'processing',
      lastRunAt: new Date(),
      error: null,
    };
    await meeting.save();

    if (!meeting.transcript || meeting.transcript.trim() === '') {
      meeting.aiProcessing = {
        ...(meeting.aiProcessing || {}),
        status: 'failed',
        error: 'Transcript unavailable for AI processing',
      };
      await meeting.save();
      return null;
    }

    const participantUsers = await User.find(
      { _id: { $in: meeting.participants.map((participant) => participant.user) } },
      'name'
    );
    const participantNames = participantUsers.map((user) => user.name);

    const summaryResult = await geminiService.generateMeetingSummary(
      meeting.transcript,
      meeting.title,
      meeting.duration || 1
    );

    meeting.aiSummary = {
      ...summaryResult,
      generatedAt: new Date(),
    };

    const actionItems = await geminiService.extractActionItems(meeting.transcript, participantNames);
    if (actionItems && actionItems.length > 0) {
      const taskPromises = actionItems.map(async (item) => {
        let assigneeId = null;
        const matchedUser = participantUsers.find(
          (user) => user.name.toLowerCase() === (item.assignee || '').toLowerCase()
        );
        if (matchedUser) {
          assigneeId = matchedUser._id;
        }

        const createdTask = await Task.create({
          title: item.title,
          description: item.description,
          meeting: meetingId,
          team: meeting.team,
          assignee: assigneeId,
          assignedBy: meeting.host,
          priority: item.priority || 'medium',
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          isAiGenerated: true,
        });

        if (assigneeId) {
          await notificationService.createAndSend({
            recipient: assigneeId,
            sender: meeting.host,
            type: 'task_assigned',
            title: 'New AI Task Assigned',
            message: `You have been assigned the task: "${item.title}" from the meeting "${meeting.title}".`,
            data: { taskId: createdTask._id, meetingId },
          });
        }

        return createdTask._id;
      });

      meeting.actionItems = await Promise.all(taskPromises);
    }

    meeting.aiProcessing = {
      ...(meeting.aiProcessing || {}),
      status: 'completed',
      lastSuccessAt: new Date(),
      error: null,
      retryCount: 0,
    };
    await meeting.save();
    await invalidateMeetingCaches(meeting.host, meetingId);

    try {
      const io = getIO();
      io.to(`meeting:${meeting.meetingCode}`).emit('ai:summary-ready', { meetingId });
    } catch (_socketErr) {
      // Socket may be unavailable during isolated test runtime.
    }

    for (const participant of meeting.participants) {
      await notificationService.createAndSend({
        recipient: participant.user,
        sender: meeting.host,
        type: 'ai_summary_ready',
        title: 'Meeting Summary Ready',
        message: `AI Summary and Action Items for meeting "${meeting.title}" are now ready.`,
        data: { meetingId },
      });
    }

    logger.info(`AI processing completed for meeting ${meetingId}`);
    return meeting;
  } catch (error) {
    logger.error(`AI processing failed for meeting ${meetingId}: ${error.message}`);
    await Meeting.findByIdAndUpdate(meetingId, {
      $set: {
        'aiProcessing.status': 'failed',
        'aiProcessing.error': error.message,
      },
      $inc: { 'aiProcessing.retryCount': 1 },
    });
    throw error;
  }
};

module.exports = {
  queueMeetingIntelligence,
  processMeetingIntelligence,
};
