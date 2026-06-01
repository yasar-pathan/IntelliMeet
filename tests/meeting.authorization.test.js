const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Team = require('../src/models/Team');
const Meeting = require('../src/models/Meeting');
const redis = require('../src/config/redis');

require('dotenv').config();
jest.setTimeout(30000);

describe('Meeting Authorization Integration Tests', () => {
  let hostUser;
  let memberUser;
  let outsiderUser;
  let hostToken;
  let memberToken;
  let outsiderToken;
  let teamId;
  let meetingId;
  let meetingCode;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellmeet_test');
    }

    await Meeting.deleteMany({ title: { $in: ['Secure Team Meeting'] } });
    await Team.deleteMany({ name: { $in: ['Secure Meeting Team'] } });
    await User.deleteMany({
      email: { $in: ['host.meeting@test.com', 'member.meeting@test.com', 'outsider.meeting@test.com'] },
    });

    hostUser = await User.create({
      name: 'Meeting Host',
      email: 'host.meeting@test.com',
      password: 'Password123!',
      isEmailVerified: true,
    });

    memberUser = await User.create({
      name: 'Meeting Member',
      email: 'member.meeting@test.com',
      password: 'Password123!',
      isEmailVerified: true,
    });

    outsiderUser = await User.create({
      name: 'Meeting Outsider',
      email: 'outsider.meeting@test.com',
      password: 'Password123!',
      isEmailVerified: true,
    });

    const hostLogin = await request(app).post('/api/v1/auth/login').send({
      email: hostUser.email,
      password: 'Password123!',
    });
    hostToken = hostLogin.body.data.accessToken;

    const memberLogin = await request(app).post('/api/v1/auth/login').send({
      email: memberUser.email,
      password: 'Password123!',
    });
    memberToken = memberLogin.body.data.accessToken;

    const outsiderLogin = await request(app).post('/api/v1/auth/login').send({
      email: outsiderUser.email,
      password: 'Password123!',
    });
    outsiderToken = outsiderLogin.body.data.accessToken;

    const team = await Team.create({
      name: 'Secure Meeting Team',
      owner: hostUser._id,
      members: [
        { user: hostUser._id, role: 'owner', joinedAt: new Date() },
        { user: memberUser._id, role: 'member', joinedAt: new Date() },
      ],
    });
    teamId = team._id.toString();

    const createMeetingRes = await request(app)
      .post('/api/v1/meetings')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Secure Team Meeting',
        type: 'instant',
        team: teamId,
      });

    meetingId = createMeetingRes.body.data._id;
    meetingCode = createMeetingRes.body.data.meetingCode;
  });

  afterAll(async () => {
    await Meeting.deleteMany({ title: { $in: ['Secure Team Meeting'] } });
    await Team.deleteMany({ name: { $in: ['Secure Meeting Team'] } });
    await User.deleteMany({
      email: { $in: ['host.meeting@test.com', 'member.meeting@test.com', 'outsider.meeting@test.com'] },
    });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (redis.status === 'ready' || redis.status === 'connect' || redis.status === 'connecting') {
      await redis.quit();
    }
  });

  it('allows team members to query meeting details by code', async () => {
    const res = await request(app)
      .get(`/api/v1/meetings/code/${meetingCode}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(meetingId);
  });

  it('blocks non-team users from querying meeting details by code', async () => {
    const res = await request(app)
      .get(`/api/v1/meetings/code/${meetingCode}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows team members to join a team-bound meeting', async () => {
    const res = await request(app)
      .post(`/api/v1/meetings/${meetingId}/join`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('turnCredentials');
  });

  it('blocks non-team users from joining a team-bound meeting', async () => {
    const res = await request(app)
      .post(`/api/v1/meetings/${meetingId}/join`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
