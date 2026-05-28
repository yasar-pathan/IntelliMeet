const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const Message = require('../models/Message');
const logger = require('../utils/logger');

/**
 * Aggregates personal analytics metrics for a user over a date range.
 * @param {string} userId - User ID
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Object>} Personal analytics results
 */
const getPersonalAnalytics = async (userId, startDate, endDate) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();

    // 1. Meetings Pipeline
    const meetingStats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { host: userObjectId },
            { 'participants.user': userObjectId }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          hosted: {
            $sum: { $cond: [{ $eq: ['$host', userObjectId] }, 1, 0] }
          },
          avgDuration: { $avg: '$duration' },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: { $ifNull: ['$total', 0] },
          hosted: { $ifNull: ['$hosted', 0] },
          attended: {
            $subtract: [
              { $ifNull: ['$total', 0] },
              { $ifNull: ['$hosted', 0] }
            ]
          },
          cancelled: { $ifNull: ['$cancelled', 0] },
          avgDuration: { $round: [{ $ifNull: ['$avgDuration', 0] }, 1] }
        }
      }
    ]);

    // 2. Tasks Pipeline
    const taskStats = await Task.aggregate([
      {
        $match: {
          assignee: userObjectId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'done'] },
                    { $lt: ['$dueDate', now] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: { $ifNull: ['$total', 0] },
          completed: { $ifNull: ['$completed', 0] },
          overdue: { $ifNull: ['$overdue', 0] },
          completionRate: {
            $cond: [
              { $gt: [{ $ifNull: ['$total', 0] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: [{ $ifNull: ['$completed', 0] }, { $ifNull: ['$total', 0] }] },
                      100
                    ]
                  },
                  1
                ]
              },
              0
            ]
          }
        }
      }
    ]);

    // 3. Collaboration (Messages count + Active Hour)
    const messageStats = await Message.aggregate([
      {
        $match: {
          sender: userObjectId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $facet: {
          totalCount: [
            { $count: 'count' }
          ],
          activeHours: [
            {
              $group: {
                _id: { $hour: '$createdAt' },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 1 }
          ]
        }
      }
    ]);

    const messagesCount = messageStats[0]?.totalCount[0]?.count || 0;
    const mostActiveHour = messageStats[0]?.activeHours[0]?._id ?? 0;

    return {
      meetings: meetingStats[0] || { total: 0, hosted: 0, attended: 0, cancelled: 0, avgDuration: 0 },
      tasks: taskStats[0] || { total: 0, completed: 0, overdue: 0, completionRate: 0 },
      collaboration: {
        messagesCount,
        mostActiveHour
      }
    };
  } catch (error) {
    logger.error(`Error aggregating personal analytics: ${error.message}`);
    throw error;
  }
};

/**
 * Aggregates analytics metrics for an entire team workspace over a date range.
 * @param {string} teamId - Team ID
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Object>} Team analytics reports
 */
const getTeamAnalytics = async (teamId, startDate, endDate) => {
  try {
    const teamObjectId = new mongoose.Types.ObjectId(teamId);

    // 1. Meetings stats
    const meetingStats = await Meeting.aggregate([
      {
        $match: {
          team: teamObjectId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $facet: {
          general: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                avgDuration: { $avg: '$duration' },
                avgParticipants: { $avg: { $size: '$participants' } }
              }
            }
          ],
          topHosts: [
            {
              $group: {
                _id: '$host',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'hostInfo'
              }
            },
            { $unwind: '$hostInfo' },
            {
              $project: {
                _id: 1,
                count: 1,
                name: '$hostInfo.name',
                avatar: '$hostInfo.avatar'
              }
            }
          ]
        }
      }
    ]);

    // 2. Tasks stats
    const taskStats = await Task.aggregate([
      {
        $match: {
          team: teamObjectId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          topContributors: [
            {
              $match: { assignee: { $ne: null } }
            },
            {
              $group: {
                _id: '$assignee',
                completed: {
                  $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
                },
                total: { $sum: 1 }
              }
            },
            { $sort: { completed: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userInfo'
              }
            },
            { $unwind: '$userInfo' },
            {
              $project: {
                _id: 1,
                completed: 1,
                total: 1,
                name: '$userInfo.name',
                avatar: '$userInfo.avatar'
              }
            }
          ]
        }
      }
    ]);

    // Parse status breakdown into a clean object
    const statusMap = { todo: 0, 'in-progress': 0, review: 0, done: 0, cancelled: 0 };
    taskStats[0]?.byStatus.forEach(item => {
      if (statusMap[item._id] !== undefined) {
        statusMap[item._id] = item.count;
      }
    });

    // 3. AI Usage stats
    const aiStats = await Meeting.aggregate([
      {
        $match: {
          team: teamObjectId,
          'aiSummary.summary': { $exists: true, $ne: null },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          summariesGenerated: { $sum: 1 }
        }
      }
    ]);

    const aiActionItemsCount = await Task.countDocuments({
      team: teamObjectId,
      isAiGenerated: true,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const generalMeetings = meetingStats[0]?.general[0] || { total: 0, avgDuration: 0, avgParticipants: 0 };

    return {
      meetings: {
        total: generalMeetings.total || 0,
        avgDuration: Math.round(generalMeetings.avgDuration || 0),
        avgParticipants: Math.round(generalMeetings.avgParticipants || 0),
        topHosts: meetingStats[0]?.topHosts || []
      },
      tasks: {
        breakdown: statusMap,
        topContributors: taskStats[0]?.topContributors || []
      },
      aiUsage: {
        summariesGenerated: aiStats[0]?.summariesGenerated || 0,
        actionItemsExtracted: aiActionItemsCount
      }
    };
  } catch (error) {
    logger.error(`Error aggregating team analytics: ${error.message}`);
    throw error;
  }
};

/**
 * Aggregates specific analytics metrics for a single meeting.
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Object>} Meeting analytics details
 */
const getMeetingAnalytics = async (meetingId) => {
  try {
    const meetingObjectId = new mongoose.Types.ObjectId(meetingId);
    
    const meeting = await Meeting.findById(meetingId)
      .populate('host', 'name avatar')
      .populate('participants.user', 'name avatar');
      
    if (!meeting) {
      throw new Error(`Meeting not found for analytics: ${meetingId}`);
    }

    // 1. Messages pipeline
    const messageStats = await Message.aggregate([
      { $match: { meeting: meetingObjectId } },
      {
        $group: {
          _id: '$sender',
          messageCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'senderInfo'
        }
      },
      { $unwind: '$senderInfo' },
      {
        $project: {
          _id: 1,
          messageCount: 1,
          name: '$senderInfo.name',
          avatar: '$senderInfo.avatar'
        }
      },
      { $sort: { messageCount: -1 } }
    ]);

    // 2. Tasks pipeline
    const taskStats = await Task.aggregate([
      { $match: { meeting: meetingObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const taskMap = { todo: 0, 'in-progress': 0, review: 0, done: 0, cancelled: 0 };
    let totalTasks = 0;
    let completedTasks = 0;
    
    taskStats.forEach(item => {
      if (taskMap[item._id] !== undefined) {
        taskMap[item._id] = item.count;
        totalTasks += item.count;
        if (item._id === 'done') {
          completedTasks += item.count;
        }
      }
    });

    const duration = meeting.duration || 0;
    const participantCount = meeting.participants.length || 0;
    const totalMessages = messageStats.reduce((sum, item) => sum + item.messageCount, 0);

    // Compute metrics
    // Engagement score = total messages / (participants * duration) [Normalized]
    let engagementScore = 0;
    if (participantCount > 0 && duration > 0) {
      engagementScore = parseFloat(((totalMessages / (participantCount * duration)) * 10).toFixed(1));
    }

    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      meetingId,
      title: meeting.title,
      scheduledAt: meeting.scheduledAt,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      duration,
      participantCount,
      totalMessages,
      engagementScore: Math.min(engagementScore, 100), // Cap at 100 for safety
      taskCompletionRate,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        breakdown: taskMap
      },
      participantChatActivity: messageStats
    };
  } catch (error) {
    logger.error(`Error aggregating meeting analytics: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getPersonalAnalytics,
  getTeamAnalytics,
  getMeetingAnalytics
};
