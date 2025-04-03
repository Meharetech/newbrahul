const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { setupDB, teardownDB, clearDatabase } = require('./setup');

// Setup and teardown
beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDatabase());

describe('Auth API', () => {
  // Test user registration
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
    });

    it('should not register a user with existing email', async () => {
      // Create a user first
      await User.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123'
      });

      // Try to register with the same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'existing@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
    });
  });

  // Test user login
  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      // Create a user first
      const user = new User({
        name: 'Login Test',
        email: 'login@example.com',
        password: 'password123'
      });
      await user.save();

      // Login with the user
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should not login with incorrect password', async () => {
      // Create a user first
      const user = new User({
        name: 'Password Test',
        email: 'password@example.com',
        password: 'password123'
      });
      await user.save();

      // Try to login with wrong password
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'password@example.com',
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
    });
  });

  // Test get user profile
  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      // Create a user first
      const user = new User({
        name: 'Profile Test',
        email: 'profile@example.com',
        password: 'password123'
      });
      await user.save();

      // Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'profile@example.com',
          password: 'password123'
        });
      
      const token = loginRes.body.token;

      // Get profile with token
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('x-auth-token', token);
      
      expect(profileRes.statusCode).toEqual(200);
      expect(profileRes.body).toHaveProperty('name', 'Profile Test');
      expect(profileRes.body).toHaveProperty('email', 'profile@example.com');
    });

    it('should not get profile without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'No token, authorization denied');
    });
  });
});
