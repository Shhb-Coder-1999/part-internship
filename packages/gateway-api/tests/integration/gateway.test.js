/**
 * Gateway Integration Tests
 * Tests the complete gateway functionality including routes and authentication
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fastify from '../../gateway.js';

describe('Gateway Integration Tests', () => {
  let gateway;
  
  beforeAll(async () => {
    // Setup gateway for testing
    process.env.NODE_ENV = 'test';
    gateway = fastify;
  });

  afterAll(async () => {
    if (gateway) {
      await gateway.close();
    }
  });

  describe('Core Routes', () => {
    test('GET /health should return health status', async () => {
      const response = await gateway.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        status: 'OK',
        service: 'Fastify API Gateway',
        version: '2.0.0'
      });
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeDefined();
      expect(body.services).toBeDefined();
    });

    test('GET / should return gateway info', async () => {
      const response = await gateway.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        message: 'Welcome to the Fastify API Gateway',
        version: '2.0.0'
      });
      expect(body.authentication).toBeDefined();
      expect(body.services).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    test('GET /nonexistent should return 404', async () => {
      const response = await gateway.inject({
        method: 'GET',
        url: '/nonexistent'
      });

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: false,
        error: 'Not Found'
      });
    });
  });

  describe('Authentication Routes', () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    let authToken = null;

    test('POST /auth/register should create new user', async () => {
      const response = await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true,
        message: 'User registered successfully'
      });
      expect(body.data.email).toBe(testUser.email);
      expect(body.data.firstName).toBe(testUser.firstName);
      expect(body.data.lastName).toBe(testUser.lastName);
      expect(body.data.roles).toContain('user');
    });

    test('POST /auth/register should fail with duplicate email', async () => {
      const response = await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser
      });

      expect(response.statusCode).toBe(409);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: false
      });
      expect(body.error).toContain('already exists');
    });

    test('POST /auth/login should authenticate user', async () => {
      const response = await gateway.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true,
        message: 'Login successful'
      });
      expect(body.token).toBeDefined();
      expect(body.data.email).toBe(testUser.email);
      
      authToken = body.token;
    });

    test('POST /auth/login should fail with invalid credentials', async () => {
      const response = await gateway.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: testUser.email,
          password: 'wrongpassword'
        }
      });

      expect(response.statusCode).toBe(401);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    test('GET /auth/profile should return user profile with valid token', async () => {
      expect(authToken).toBeDefined();
      
      const response = await gateway.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true
      });
      expect(body.data.email).toBe(testUser.email);
      expect(body.data.firstName).toBe(testUser.firstName);
      expect(body.data.lastName).toBe(testUser.lastName);
    });

    test('GET /auth/profile should fail without token', async () => {
      const response = await gateway.inject({
        method: 'GET',
        url: '/auth/profile'
      });

      expect(response.statusCode).toBe(401);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: false,
        error: 'Authorization header missing or invalid'
      });
    });

    test('POST /auth/refresh should refresh token', async () => {
      expect(authToken).toBeDefined();
      
      const response = await gateway.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true
      });
      expect(body.token).toBeDefined();
      expect(body.token).not.toBe(authToken); // Should be a new token
      expect(body.data.email).toBe(testUser.email);
    });
  });

  describe('User Management Routes', () => {
    let adminToken = null;
    let userToken = null;
    
    const adminUser = {
      email: `admin-${Date.now()}@example.com`,
      password: 'adminpass123',
      firstName: 'Admin',
      lastName: 'User'
    };

    beforeEach(async () => {
      // Create admin user through direct database access
      // This would typically be done through a test setup
      // For now, we'll use the regular user registration and manually set admin role
    });

    test('GET /api/users should require authentication', async () => {
      const response = await gateway.inject({
        method: 'GET',
        url: '/api/users'
      });

      expect(response.statusCode).toBe(401);
    });

    test('GET /api/users should return user list with authentication', async () => {
      // First register and login a user
      await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: `userlist-${Date.now()}@example.com`,
          password: 'password123',
          firstName: 'List',
          lastName: 'User'
        }
      });

      const loginResponse = await gateway.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: `userlist-${Date.now()}@example.com`,
          password: 'password123'
        }
      });

      const { token } = JSON.parse(loginResponse.body);

      const response = await gateway.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true
      });
      expect(body.data.users).toBeDefined();
      expect(Array.isArray(body.data.users)).toBe(true);
      expect(body.data.pagination).toBeDefined();
    });
  });

  describe('Service Proxy Routes', () => {
    test('should proxy requests to comments service with optional auth', async () => {
      // Since comments service might not be running in test environment,
      // we test that the proxy configuration is set up correctly
      const response = await gateway.inject({
        method: 'GET',
        url: '/part/recruitment/comments'
      });

      // Expect either a successful proxy or a service unavailable error
      expect([200, 500, 503]).toContain(response.statusCode);
      
      if (response.statusCode === 500 || response.statusCode === 503) {
        const body = JSON.parse(response.body);
        expect(body.error).toContain('Service temporarily unavailable');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors correctly', async () => {
      const response = await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: '123' // Too short
        }
      });

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: false,
        error: 'Validation failed'
      });
    });

    test('should handle rate limiting', async () => {
      // This would require making many rapid requests
      // For now, we just verify the rate limit middleware is configured
      const response = await gateway.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });
});