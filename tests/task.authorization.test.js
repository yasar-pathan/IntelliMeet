const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Team = require('../src/models/Team');
const Task = require('../src/models/Task');
const redis = require('../src/config/redis');

require('dotenv').config();
jest.setTimeout(30000);

describe('Task Authorization Integration Tests', () => {
  let ownerUser;
  let outsiderUser;
  let ownerToken;
  let outsiderToken;
  let teamId;
  let taskId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellmeet_test');
    }

    await Task.deleteMany({ title: { $in: ['Secure Team Task'] } });
    await Team.deleteMany({ name: { $in: ['Secure Team'] } });
    await User.deleteMany({ email: { $in: ['owner.task@test.com', 'outsider.task@test.com'] } });

    ownerUser = await User.create({
      name: 'Task Owner',
      email: 'owner.task@test.com',
      password: 'Password123!',
      isEmailVerified: true,
    });

    outsiderUser = await User.create({
      name: 'Task Outsider',
      email: 'outsider.task@test.com',
      password: 'Password123!',
      isEmailVerified: true,
    });

    const ownerLogin = await request(app).post('/api/v1/auth/login').send({
      email: ownerUser.email,
      password: 'Password123!',
    });
    ownerToken = ownerLogin.body.data.accessToken;

    const outsiderLogin = await request(app).post('/api/v1/auth/login').send({
      email: outsiderUser.email,
      password: 'Password123!',
    });
    outsiderToken = outsiderLogin.body.data.accessToken;

    const team = await Team.create({
      name: 'Secure Team',
      owner: ownerUser._id,
      members: [{ user: ownerUser._id, role: 'owner', joinedAt: new Date() }],
    });
    teamId = team._id.toString();
  });

  afterAll(async () => {
    await Task.deleteMany({ title: { $in: ['Secure Team Task'] } });
    await Team.deleteMany({ name: { $in: ['Secure Team'] } });
    await User.deleteMany({ email: { $in: ['owner.task@test.com', 'outsider.task@test.com'] } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (redis.status === 'ready' || redis.status === 'connect' || redis.status === 'connecting') {
      await redis.quit();
    }
  });

  it('blocks task creation in a team for non-members', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({
        title: 'Secure Team Task',
        team: teamId,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows team member to create a team task', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Secure Team Task',
        team: teamId,
        assignee: ownerUser._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    taskId = res.body.data._id;
  });

  it('blocks outsider from fetching protected task by id', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('blocks outsider from updating protected task', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ title: 'Unauthorized Update Attempt' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('blocks outsider from listing team tasks using explicit team filter', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks?team=${teamId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
