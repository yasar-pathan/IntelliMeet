const logger = require('../utils/logger');

const registerNotificationHandlers = (io, socket) => {
  const userId = socket.user._id;

  // Client confirms receipt of a real-time notification
  socket.on('notification:acknowledge', ({ notificationId }) => {
    if (!notificationId) return;
    logger.debug(`Notification ${notificationId} acknowledged by user ${userId}`);
  });
};

module.exports = registerNotificationHandlers;
