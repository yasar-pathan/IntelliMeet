const express = require('express');
const chatController = require('../controllers/chat.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// Apply JWT verification to all chat routes
router.use(verifyJWT);

// Message creation (supports text or binary file attachment uploads)
router.post('/messages', upload.single('file'), chatController.sendMessage);

// Message history retrieval
router.get('/meetings/:meetingId', chatController.getMessages);

// Edit/demolish single message
router.patch('/messages/:messageId', chatController.editMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);

module.exports = router;
