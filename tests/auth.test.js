const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../models/User');
const redis = require('../config/redis');

// Load environment variables for testing
require('dotenv').config();

describe('Auth System Integration Tests', () => {
  const testUser = {
    name: 'Test Engineer',
    email: 'test.engineer@intellmeet.com',
    password: 'Password123!',
    confirmPassword: 'Password123!'
  };

  beforeAll(async () => {
    // Connect to database if not connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellmeet_test');
    }
    // Clean database before tests
    await User.deleteMany({ email: testUser.email });
  });

  afterAll(async () => {
    // Cleanup and disconnect
    await User.deleteMany({ email: testUser.email });
    await mongoose.connection.close();
    await redis.quit();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return 409 conflict when registering with an existing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 403 when trying to log in with an unverified email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('verify your email');
    });

    it('should return 401 when trying to log in with a wrong password', async () => {
      // Manually verify user for password tests
      await User.updateOne({ email: testUser.email }, { $set: { isEmailVerified: true } });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Access Control tests', () => {
    it('should return 401 when accessing protected route /me without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when accessing route with a blacklisted access token', async () => {
      // Login to get tokens
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const token = loginRes.body.data.accessToken;
      const cookie = loginRes.headers['set-cookie'];

      // Logout to blacklist token
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', cookie);

      // Access protected route again using blacklisted token
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
