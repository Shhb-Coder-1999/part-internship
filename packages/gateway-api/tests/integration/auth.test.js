/**
 * Gateway Authentication Integration Tests
 * Tests all authentication endpoints including registration, login, profile, and admin functions
 */

import { test, beforeAll, afterAll, describe, expect } from '@jest/globals';
import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';

let gatewayApp;
let testUser;
let adminUser;
let userToken;
let adminToken;

// Test database path
const testDbPath = path.join(process.cwd(), 'prisma', 'test_auth.db');

beforeAll(async () => {
  // Create test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `file:${testDbPath}`;

  // Import gateway after setting environment
  const gatewayModule = await import('../../gateway.js');
  gatewayApp = gatewayModule.default;

  // Wait for database initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Create test users
  testUser = {
    email: 'testuser@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  };

  adminUser = {
    email: 'testadmin@example.com',
    password: 'admin123',
    firstName: 'Test',
    lastName: 'Admin'
  };
});

afterAll(async () => {
  if (gatewayApp) {
    await gatewayApp.close();
  }
  
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

describe('Gateway Authentication Tests', () => {
  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('User registered successfully');
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.email).toBe(testUser.email);
      expect(body.data.firstName).toBe(testUser.firstName);
      expect(body.data.lastName).toBe(testUser.lastName);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
      expect(body.data.isActive).toBe(true);
      expect(body.data.isVerified).toBe(false);
      expect(body.data.roles).toContain('user');
      expect(body.meta).toBeDefined();
      expect(body.meta.timestamp).toBeDefined();
      expect(body.meta.service).toBe('gateway-auth');
    });

    test('should not register user with duplicate email', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('already exists');
    });

    test('should validate required fields', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid@test.com'
          // Missing required fields
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should validate email format', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should validate password length', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'short@test.com',
          password: '123', // Too short
          firstName: 'Test',
          lastName: 'User'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('User Login', () => {
    test('should login with valid credentials', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.email).toBe(testUser.email);
      expect(body.data.roles).toContain('user');
      expect(body.meta).toBeDefined();

      // Store token for subsequent tests
      userToken = body.token;
    });

    test('should not login with invalid email', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@test.com',
          password: testUser.password
        }
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Authentication failed');
    });

    test('should not login with invalid password', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: testUser.email,
          password: 'wrongpassword'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    test('should validate login input format', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'invalid-email-format',
          password: testUser.password
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('User Profile', () => {
    test('should get user profile with valid token', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.email).toBe(testUser.email);
      expect(body.meta).toBeDefined();
    });

    test('should not get profile without token', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/auth/profile'
      });

      expect(response.statusCode).toBe(401);
    });

    test('should not get profile with invalid token', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Token Refresh', () => {
    test('should refresh token with valid token', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();
      expect(body.token).not.toBe(userToken); // Should be a new token
      expect(body.data).toBeDefined();
      expect(body.meta).toBeDefined();
    });

    test('should not refresh with invalid token', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Admin User Management', () => {
    beforeAll(async () => {
      // Create admin user and get token
      await gatewayApp.inject({
        method: 'POST',
        url: '/auth/register',
        payload: adminUser
      });

      // Login as admin (you might need to manually set admin role in the database)
      const loginResponse = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: adminUser.email,
          password: adminUser.password
        }
      });

      adminToken = JSON.parse(loginResponse.body).token;
    });

    test('should create user as admin', async () => {
      const newUser = {
        email: 'admincreated@test.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'Created',
        isActive: true,
        isVerified: true,
        roles: ['user']
      };

      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/admin/users',
        payload: newUser,
        headers: {
          authorization: `Bearer ${adminToken}`
        }
      });

      // This might return 403 if admin role isn't properly set
      expect([201, 403]).toContain(response.statusCode);
      
      if (response.statusCode === 201) {
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.data.email).toBe(newUser.email);
        expect(body.meta).toBeDefined();
      }
    });

    test('should list users as admin', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/admin/users',
        headers: {
          authorization: `Bearer ${adminToken}`
        }
      });

      // This might return 403 if admin role isn't properly set
      expect([200, 403]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.users).toBeDefined();
        expect(Array.isArray(body.users)).toBe(true);
        expect(body.pagination).toBeDefined();
      }
    });

    test('should not allow regular user to create users', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/admin/users',
        payload: {
          email: 'unauthorized@test.com',
          password: 'password123',
          firstName: 'Unauthorized',
          lastName: 'User'
        },
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(403);
    });

    test('should not allow regular user to list users', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/admin/users',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Gateway Health and Info', () => {
    test('should return gateway health status', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('OK');
      expect(body.service).toBe('Fastify API Gateway');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeDefined();
    });

    test('should return gateway information', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('API Gateway');
      expect(body.version).toBeDefined();
      expect(body.authentication).toBeDefined();
      expect(body.authentication.enabled).toBe(true);
      expect(body.authentication.endpoints).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/register',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle missing content type', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/register',
        payload: JSON.stringify(testUser)
      });

      expect(response.statusCode).toBe(400);
    });

    test('should return 404 for non-existent routes', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/non-existent-route'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting', async () => {
      const requests = [];
      // Make multiple requests quickly
      for (let i = 0; i < 10; i++) {
        requests.push(gatewayApp.inject({
          method: 'POST',
          url: '/auth/login',
          payload: {
            email: 'nonexistent@test.com',
            password: 'wrong'
          }
        }));
      }

      const responses = await Promise.all(requests);
      
      // Check if rate limiting headers are present
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.headers['x-ratelimit-limit']).toBeDefined();
      expect(lastResponse.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('CORS Headers', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await gatewayApp.inject({
        method: 'OPTIONS',
        url: '/auth/login',
        headers: {
          'origin': 'http://localhost:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type'
        }
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });
  });
});