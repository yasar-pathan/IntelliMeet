const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { verifyJWT } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply JWT verification to all notification routes
router.use(verifyJWT);

// Notification query list
router.get('/', notificationController.getNotifications);

// Fast unread count endpoint (Placed before :id to prevent route parameter collision)
router.get('/unread-count', notificationController.getUnreadCount);

// Bulk updates endpoint (Placed before :id to prevent collision)
router.patch('/read-all', notificationController.markAllRead);

// Single notification operations
router.patch('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
