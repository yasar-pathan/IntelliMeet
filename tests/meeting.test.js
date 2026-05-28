const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const redis = require('../config/redis');

// Load environment variables for testing
require('dotenv').config();

describe('Meeting System Integration Tests', () => {
  let hostUser, hostToken, participantUser, participantToken;
  let meetingId, meetingCode;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellmeet_test');
    }

    // Clear test data
    await User.deleteMany({ email: { $in: ['host@test.com', 'participant@test.com'] } });
    await Meeting.deleteMany({ title: 'Test Integration Meeting' });

    // Create host and participant users
    hostUser = await User.create({
      name: 'Host User',
      email: 'host@test.com',
      password: 'Password123!',
      isEmailVerified: true
    });

    participantUser = await User.create({
      name: 'Participant User',
      email: 'participant@test.com',
      password: 'Password123!',
      isEmailVerified: true
    });

    // Obtain access tokens by calling login
    const hostLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'host@test.com', password: 'Password123!' });
    hostToken = hostLogin.body.data.accessToken;

    const participantLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'participant@test.com', password: 'Password123!' });
    participantToken = participantLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Teardown
    await User.deleteMany({ email: { $in: ['host@test.com', 'participant@test.com'] } });
    await Meeting.deleteMany({ title: 'Test Integration Meeting' });
    await mongoose.connection.close();
    await redis.quit();
  });

  describe('POST /api/v1/meetings', () => {
    it('should create a meeting successfully and return 201 with meetingCode', async () => {
      const res = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Test Integration Meeting',
          description: 'A mock meeting to run integrations',
          type: 'instant'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('meetingCode');
      expect(res.body.data.meetingCode).toHaveLength(8);
      
      meetingId = res.body.data._id;
      meetingCode = res.body.data.meetingCode;
    });
  });

  describe('POST /api/v1/meetings/:meetingId/join', () => {
    it('should join the meeting successfully and return WebRTC TURN credentials', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('turnCredentials');
      expect(res.body.data.turnCredentials).toHaveProperty('urls');
    });
  });

  describe('PATCH /api/v1/meetings/:meetingId', () => {
    it('should fail (403) when an unauthorized participant user attempts to update meeting settings', async () => {
      const res = await request(app)
        .patch(`/api/v1/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Hacked title'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should succeed (200) when the host user updates the meeting details', async () => {
      const res = await request(app)
        .patch(`/api/v1/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Test Integration Meeting Updated'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Integration Meeting Updated');
    });
  });

  describe('POST /api/v1/meetings/:meetingId/leave', () => {
    it('should leave meeting and transition status to ended when last participant leaves', async () => {
      // 1. Participant leaves
      await request(app)
        .post(`/api/v1/meetings/${meetingId}/leave`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send();

      // 2. Host leaves
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/leave`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send();

      expect(res.status).toBe(200);
      
      // Verify in DB that status is 'ended'
      const meeting = await Meeting.findById(meetingId);
      expect(meeting.status).toBe('ended');
    });
  });
});
