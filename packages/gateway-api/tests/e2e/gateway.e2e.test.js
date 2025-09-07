/**
 * Gateway End-to-End Tests
 * Tests complete user workflows through the gateway
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fastify from '../../gateway.js';

describe('Gateway E2E Tests', () => {
  let gateway;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    gateway = fastify;
    // Give gateway time to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (gateway) {
      await gateway.close();
    }
  });

  describe('Complete User Registration and Authentication Flow', () => {
    const testUser = {
      email: `e2e-${Date.now()}@example.com`,
      password: 'securepassword123',
      firstName: 'E2E',
      lastName: 'TestUser'
    };

    let authToken = null;
    let userId = null;

    test('User Registration Flow', async () => {
      // Step 1: Register new user
      const registerResponse = await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser
      });

      expect(registerResponse.statusCode).toBe(201);
      
      const registerBody = JSON.parse(registerResponse.body);
      expect(registerBody.success).toBe(true);
      expect(registerBody.message).toBe('User registered successfully');
      expect(registerBody.data.email).toBe(testUser.email);
      
      userId = registerBody.data.id;

      // Step 2: Login with the new user
      const loginResponse = await gateway.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password
        }
      });

      expect(loginResponse.statusCode).toBe(200);
      
      const loginBody = JSON.parse(loginResponse.body);
      expect(loginBody.success).toBe(true);
      expect(loginBody.token).toBeDefined();
      
      authToken = loginBody.token;

      // Step 3: Access protected profile endpoint
      const profileResponse = await gateway.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(profileResponse.statusCode).toBe(200);
      
      const profileBody = JSON.parse(profileResponse.body);
      expect(profileBody.success).toBe(true);
      expect(profileBody.data.email).toBe(testUser.email);
      expect(profileBody.data.id).toBe(userId);
    });

    test('User Data Management Flow', async () => {
      expect(authToken).toBeDefined();
      expect(userId).toBeDefined();

      // Step 1: Get user profile
      const getProfileResponse = await gateway.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(getProfileResponse.statusCode).toBe(200);

      // Step 2: Update user profile
      const updateData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        phoneNumber: '+1234567890'
      };

      const updateResponse = await gateway.inject({
        method: 'PUT',
        url: `/api/users/${userId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: updateData
      });

      expect(updateResponse.statusCode).toBe(200);
      
      const updateBody = JSON.parse(updateResponse.body);
      expect(updateBody.success).toBe(true);
      expect(updateBody.data.firstName).toBe(updateData.firstName);
      expect(updateBody.data.lastName).toBe(updateData.lastName);
      expect(updateBody.data.phoneNumber).toBe(updateData.phoneNumber);

      // Step 3: Verify update by getting profile again
      const verifyResponse = await gateway.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(verifyResponse.statusCode).toBe(200);
      
      const verifyBody = JSON.parse(verifyResponse.body);
      expect(verifyBody.data.firstName).toBe(updateData.firstName);
      expect(verifyBody.data.lastName).toBe(updateData.lastName);
    });

    test('Token Refresh Flow', async () => {
      expect(authToken).toBeDefined();

      // Step 1: Use current token to refresh
      const refreshResponse = await gateway.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(refreshResponse.statusCode).toBe(200);
      
      const refreshBody = JSON.parse(refreshResponse.body);
      expect(refreshBody.success).toBe(true);
      expect(refreshBody.token).toBeDefined();
      expect(refreshBody.token).not.toBe(authToken);

      const newToken = refreshBody.token;

      // Step 2: Use new token to access protected resource
      const profileResponse = await gateway.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          authorization: `Bearer ${newToken}`
        }
      });

      expect(profileResponse.statusCode).toBe(200);
      
      const profileBody = JSON.parse(profileResponse.body);
      expect(profileBody.success).toBe(true);
      expect(profileBody.data.email).toBe(testUser.email);
    });
  });

  describe('User List and Search Flow', () => {
    let userToken = null;

    beforeAll(async () => {
      // Create a test user for this flow
      const testUser = {
        email: `listuser-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'List',
        lastName: 'User'
      };

      await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser
      });

      const loginResponse = await gateway.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password
        }
      });

      const loginBody = JSON.parse(loginResponse.body);
      userToken = loginBody.token;
    });

    test('User List with Pagination', async () => {
      expect(userToken).toBeDefined();

      // Test default pagination
      const response = await gateway.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toBeDefined();
      expect(Array.isArray(body.data.users)).toBe(true);
      expect(body.data.pagination).toMatchObject({
        page: 1,
        limit: 20
      });
      expect(body.data.pagination.total).toBeGreaterThan(0);
      expect(body.data.pagination.totalPages).toBeGreaterThan(0);

      // Test custom pagination
      const customResponse = await gateway.inject({
        method: 'GET',
        url: '/api/users?page=1&limit=5',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(customResponse.statusCode).toBe(200);
      
      const customBody = JSON.parse(customResponse.body);
      expect(customBody.data.pagination.page).toBe(1);
      expect(customBody.data.pagination.limit).toBe(5);
      expect(customBody.data.users.length).toBeLessThanOrEqual(5);
    });

    test('User Search', async () => {
      expect(userToken).toBeDefined();

      // Search for users
      const response = await gateway.inject({
        method: 'GET',
        url: '/api/users?search=List',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toBeDefined();
      
      // Should find at least our test user
      const foundTestUser = body.data.users.find(user => 
        user.firstName === 'List' || user.lastName === 'User'
      );
      expect(foundTestUser).toBeDefined();
    });

    test('Get Individual User', async () => {
      expect(userToken).toBeDefined();

      // First get list to find a user ID
      const listResponse = await gateway.inject({
        method: 'GET',
        url: '/api/users?limit=1',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      const listBody = JSON.parse(listResponse.body);
      expect(listBody.data.users.length).toBeGreaterThan(0);
      
      const userId = listBody.data.users[0].id;

      // Get individual user
      const userResponse = await gateway.inject({
        method: 'GET',
        url: `/api/users/${userId}`,
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(userResponse.statusCode).toBe(200);
      
      const userBody = JSON.parse(userResponse.body);
      expect(userBody.success).toBe(true);
      expect(userBody.data.id).toBe(userId);
      expect(userBody.data.email).toBeDefined();
      expect(userBody.data.firstName).toBeDefined();
      expect(userBody.data.lastName).toBeDefined();
    });
  });

  describe('Authorization and Access Control Flow', () => {
    test('Unauthorized Access Attempts', async () => {
      // Try to access protected resource without token
      const noTokenResponse = await gateway.inject({
        method: 'GET',
        url: '/api/users'
      });

      expect(noTokenResponse.statusCode).toBe(401);
      
      const noTokenBody = JSON.parse(noTokenResponse.body);
      expect(noTokenBody.success).toBe(false);
      expect(noTokenBody.error).toContain('Authorization header missing');

      // Try with invalid token
      const invalidTokenResponse = await gateway.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(invalidTokenResponse.statusCode).toBe(401);
      
      const invalidTokenBody = JSON.parse(invalidTokenResponse.body);
      expect(invalidTokenBody.success).toBe(false);
      expect(invalidTokenBody.error).toBe('Invalid token');
    });

    test('User Profile Update Authorization', async () => {
      // Create two users
      const user1 = {
        email: `user1-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'User1',
        lastName: 'Test'
      };

      const user2 = {
        email: `user2-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'User2',
        lastName: 'Test'
      };

      // Register both users
      const register1 = await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: user1
      });

      const register2 = await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: user2
      });

      const user1Id = JSON.parse(register1.body).data.id;
      const user2Id = JSON.parse(register2.body).data.id;

      // Login as user1
      const login1 = await gateway.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user1.email,
          password: user1.password
        }
      });

      const user1Token = JSON.parse(login1.body).token;

      // Try to update user2's profile with user1's token
      const unauthorizedUpdate = await gateway.inject({
        method: 'PUT',
        url: `/api/users/${user2Id}`,
        headers: {
          authorization: `Bearer ${user1Token}`
        },
        payload: {
          firstName: 'Hacked'
        }
      });

      expect(unauthorizedUpdate.statusCode).toBe(403);
      
      const unauthorizedBody = JSON.parse(unauthorizedUpdate.body);
      expect(unauthorizedBody.success).toBe(false);
      expect(unauthorizedBody.error).toContain('Access denied');

      // But user1 should be able to update their own profile
      const authorizedUpdate = await gateway.inject({
        method: 'PUT',
        url: `/api/users/${user1Id}`,
        headers: {
          authorization: `Bearer ${user1Token}`
        },
        payload: {
          firstName: 'UpdatedUser1'
        }
      });

      expect(authorizedUpdate.statusCode).toBe(200);
      
      const authorizedBody = JSON.parse(authorizedUpdate.body);
      expect(authorizedBody.success).toBe(true);
      expect(authorizedBody.data.firstName).toBe('UpdatedUser1');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Malformed Request Bodies', async () => {
      const response = await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: 'invalid-json',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect([400, 415]).toContain(response.statusCode);
    });

    test('Missing Required Fields', async () => {
      const response = await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com'
          // Missing password, firstName, lastName
        }
      });

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Validation failed');
    });

    test('Large Request Body Handling', async () => {
      const largePayload = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'A'.repeat(1000),
        lastName: 'Test'
      };

      const response = await gateway.inject({
        method: 'POST',
        url: '/auth/register',
        payload: largePayload
      });

      // Should either accept it or reject it gracefully
      expect([200, 201, 400, 413]).toContain(response.statusCode);
    });
  });
});