const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { verifyJWT } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply JWT verification to all analytics routes
router.use(verifyJWT);

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/personal', analyticsController.getPersonalStats);
router.get('/team/:teamId', analyticsController.getTeamStats);
router.get('/meeting/:meetingId', analyticsController.getMeetingStats);

module.exports = router;
