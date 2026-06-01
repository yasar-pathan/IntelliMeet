const express = require('express');
const meetingController = require('../controllers/meeting.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { 
  createMeetingSchema, 
  updateMeetingSchema, 
  joinMeetingSchema 
} = require('../validators/meeting.validator');
const recordingUpload = require('../middleware/recordingUpload.middleware');

const router = express.Router();

// Apply JWT verification to all meeting routes
router.use(verifyJWT);

// Meeting collection endpoints
router.post('/', validate(createMeetingSchema), meetingController.createMeeting);
router.get('/', meetingController.getMeetings);

// Join check by code
router.get('/code/:meetingCode', meetingController.getMeetingByCode);

// Single meeting endpoints
router.get('/:meetingId', meetingController.getMeetingById);
router.patch('/:meetingId', validate(updateMeetingSchema), meetingController.updateMeeting);
router.post('/:meetingId/cancel', meetingController.cancelMeeting);
router.delete('/:meetingId', meetingController.deleteMeeting);

// Meeting session status actions
router.post('/:meetingId/join', validate(joinMeetingSchema), meetingController.joinMeeting);
router.post('/:meetingId/leave', meetingController.leaveMeeting);

// Recording endpoints
router.post('/:meetingId/recording/start', meetingController.startRecording);
router.post('/:meetingId/recording/stop', meetingController.stopRecording);
router.post(
  '/:meetingId/recording/upload',
  recordingUpload.single('recording'),
  meetingController.uploadMeetingRecording
);
router.get('/:meetingId/recording/playback', meetingController.getRecordingPlayback);
router.get('/:meetingId/recording/stream', meetingController.streamRecording);

// Post-meeting AI results retrieve
router.get('/:meetingId/summary', meetingController.getMeetingSummary);

module.exports = router;
