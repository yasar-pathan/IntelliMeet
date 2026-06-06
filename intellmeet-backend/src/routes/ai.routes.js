const express = require('express');
const aiController = require('../controllers/ai.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

// Apply authorization and AI rate limiting to all AI endpoints
router.use(verifyJWT);
router.use(aiLimiter);

router.post('/summarize/:meetingId', aiController.summarizeMeeting);
router.post('/extract-actions/:meetingId', aiController.extractActions);
router.post('/generate-agenda', aiController.generateAgenda);
router.get('/productivity/:meetingId', aiController.getProductivityAnalysis);
router.get('/status/:meetingId', aiController.getAiProcessingStatus);
router.post('/meeting-chat/:meetingId', aiController.askQuestion);
router.get('/meeting-chat/:meetingId', aiController.getChatHistory);

module.exports = router;
