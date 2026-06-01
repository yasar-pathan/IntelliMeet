const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Meeting = require('../src/models/Meeting');
const redis = require('../src/config/redis');

require('dotenv').config();
jest.setTimeout(30000);

describe('AI Status Endpoint Integration Tests', () => {
  let hostToken;
  let outsiderToken;
  let meetingId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellmeet_test');
    }

    await Meeting.deleteMany({ title: { $in: ['AI Status Test Meeting'] } });
    await User.deleteMany({ email: { $in: ['host.ai@test.com', 'outsider.ai@test.com'] } });

    await User.create({
      name: 'AI Host',
      email: 'host.ai@test.com',
      password: 'Password123!',
      isEmailVerified: true,
    });

    await User.create({
      name: 'AI Outsider',
      email: 'outsider.ai@test.com',
      password: 'Password123!',
      isEmailVerified: true,
    });

    const hostLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'host.ai@test.com',
      password: 'Password123!',
    });
    hostToken = hostLogin.body.data.accessToken;

    const outsiderLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'outsider.ai@test.com',
      password: 'Password123!',
    });
    outsiderToken = outsiderLogin.body.data.accessToken;

    const createMeetingRes = await request(app)
      .post('/api/v1/meetings')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'AI Status Test Meeting',
        type: 'instant',
      });

    meetingId = createMeetingRes.body.data._id;
  });

  afterAll(async () => {
    await Meeting.deleteMany({ title: { $in: ['AI Status Test Meeting'] } });
    await User.deleteMany({ email: { $in: ['host.ai@test.com', 'outsider.ai@test.com'] } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (redis.status === 'ready' || redis.status === 'connect' || redis.status === 'connecting') {
      await redis.quit();
    }
  });

  it('returns ai processing state for participants/host', async () => {
    const res = await request(app)
      .get(`/api/v1/ai/status/${meetingId}`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status');
  });

  it('blocks non-participants from fetching ai status', async () => {
    const res = await request(app)
      .get(`/api/v1/ai/status/${meetingId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
