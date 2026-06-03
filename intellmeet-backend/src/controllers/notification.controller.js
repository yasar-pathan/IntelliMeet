const Notification = require('../models/Notification');
const notificationService = require('../services/notification.service');
const redis = require('../config/redis');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/v1/notifications
 * @desc    Get paginated notifications for current user
 * @access  Private
 * @query   { page, limit }
 * @returns { ApiResponse } 200 OK status with notifications array
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: userId })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments({ recipient: userId });

  res.status(200).json(
    new ApiResponse(200, {
      data: notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total
    }, 'Notifications retrieved successfully')
  );
});

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 * @returns { ApiResponse } 200 OK status with updated notification
 */
const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await notificationService.markAsRead(id, userId);

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
});

/**
 * @route   PATCH /api/v1/notifications/read-all
 * @desc    Mark all notifications for the user as read
 * @access  Private
 * @returns { ApiResponse } 200 OK success message
 */
const markAllRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  // Invalidate cache
  await redis.del(`notifications:unread:${userId}`);

  res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get count of unread notifications (fast cached)
 * @access  Private
 * @returns { ApiResponse } 200 OK status with count number
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const unreadCount = await notificationService.getUnreadCount(userId);

  res.status(200).json(
    new ApiResponse(200, { unreadCount }, 'Unread count retrieved')
  );
});

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 * @returns { ApiResponse } 200 OK success message
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndDelete({ _id: id, recipient: userId });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  // Invalidate count cache
  await redis.del(`notifications:unread:${userId}`);

  res.status(200).json(new ApiResponse(200, null, 'Notification deleted successfully'));
});

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
  deleteNotification
};
