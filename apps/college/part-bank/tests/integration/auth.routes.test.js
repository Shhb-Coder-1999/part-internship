/**
 * Integration Tests for Auth Routes
 */

import { createFastifyServer } from '../../src/server-instance.js';
import { createTestUser, createTestUserWithToken, cleanupTestData, isValidUUID, isValidISODate } from '../helpers/testHelpers.js';

describe('Auth Routes', () => {
  let fastify;

  beforeAll(async () => {
    fastify = await createFastifyServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/auth/sign-up', () => {
    const validSignUpData = {
      firstName: 'علی',
      lastName: 'احمدی',
      idNumber: '1234567890',
      phoneNumber: '09123456789',
      password: 'password123'
    };

    test('should create user successfully', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: validSignUpData
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('userId');
      expect(body.data).toHaveProperty('phoneNumber', '09123456789');
      expect(body.data).toHaveProperty('firstName', 'علی');
      expect(body.data).toHaveProperty('lastName', 'احمدی');
      expect(body.data).toHaveProperty('createdAt');
      
      expect(isValidUUID(body.data.userId)).toBe(true);
      expect(isValidISODate(body.data.createdAt)).toBe(true);
    });

    test('should return 409 for duplicate phone number', async () => {
      await createTestUser({ phoneNumber: '09123456789' });

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: validSignUpData
      });

      expect(response.statusCode).toBe(409);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'PHONE_EXISTS');
    });

    test('should return 422 for validation errors', async () => {
      const invalidData = {
        firstName: '',
        lastName: 'احمدی',
        idNumber: '123',
        phoneNumber: '123',
        password: '12'
      };

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: invalidData
      });

      expect(response.statusCode).toBe(422);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('should validate required fields', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser({
        phoneNumber: '09123456789'
      });
    });

    test('should login successfully with valid credentials', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          phoneNumber: '09123456789',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('token');
      expect(body.data).toHaveProperty('expiresIn');
      expect(body.data).toHaveProperty('user');
      expect(body.data.user).toHaveProperty('userId', testUser.id);
      expect(body.data.user).toHaveProperty('phoneNumber', '09123456789');
    });

    test('should return 401 for invalid credentials', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          phoneNumber: '09123456789',
          password: 'wrongpassword'
        }
      });

      expect(response.statusCode).toBe(401);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    test('should return 401 for non-existent user', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          phoneNumber: '09123456700',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    test('should return 422 for validation errors', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          phoneNumber: '123',
          password: ''
        }
      });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully with valid token', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(204);
    });

    test('should return 401 without token', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/logout'
      });

      expect(response.statusCode).toBe(401);
    });

    test('should return 401 with invalid token', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          Authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    test('should return user profile with valid token', async () => {
      const { user, token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/auth/profile',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('userId', user.id);
      expect(body.data).toHaveProperty('phoneNumber', user.phoneNumber);
      expect(body.data).toHaveProperty('firstName', user.firstName);
      expect(body.data).toHaveProperty('lastName', user.lastName);
      expect(body.data).toHaveProperty('status', user.status);
    });

    test('should return 401 without token', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/auth/profile'
      });

      expect(response.statusCode).toBe(401);
    });

    test('should return 401 with invalid token', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/auth/profile',
        headers: {
          Authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    test('should change password successfully', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          Authorization: `Bearer ${token}`
        },
        payload: {
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('success', true);
    });

    test('should return 401 with wrong current password', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          Authorization: `Bearer ${token}`
        },
        payload: {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    test('should return 422 for weak new password', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          Authorization: `Bearer ${token}`
        },
        payload: {
          currentPassword: 'password123',
          newPassword: '123'
        }
      });

      expect(response.statusCode).toBe(422);
    });
  });
});