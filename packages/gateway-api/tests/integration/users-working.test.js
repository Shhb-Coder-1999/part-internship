/**
 * Working User Endpoints Tests
 * Tests using existing database data
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Import the gateway app
import gatewayApp from '../../gateway.js';

const prisma = new PrismaClient();

describe('User Endpoints - Working Tests', () => {
  let app;
  let userToken;
  let testUser;

  beforeAll(async () => {
    app = gatewayApp;

    // Get an existing user from the database
    testUser = await prisma.user.findFirst({
      where: { isActive: true }
    });

    if (!testUser) {
      throw new Error('No users found in database. Please run db:seed first.');
    }

    // Generate a token for this user
    userToken = app.jwt.sign({
      id: testUser.id,
      email: testUser.email,
      roles: ['user'],
    });

    console.log('Using test user:', testUser.email);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Authentication', () => {
    test('should reject requests without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    test('should reject requests with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/users - List Users', () => {
    test('should return users with default pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('users');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray(body.data.users)).toBe(true);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(20);
      expect(body.data.pagination.total).toBeGreaterThan(0);
      
      console.log(`Found ${body.data.pagination.total} users`);
    });

    test('should handle pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?page=1&limit=5',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(5);
      expect(body.data.users.length).toBeLessThanOrEqual(5);
    });

    test('should enforce maximum limit', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?limit=200',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.limit).toBeLessThanOrEqual(100);
    });

    test('should search users by Persian names', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?search=حسن',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // If we found users, they should contain the search term
      if (body.data.users.length > 0) {
        const foundUser = body.data.users.find(u => 
          u.firstName?.includes('حسن') || 
          u.lastName?.includes('حسن') || 
          u.email?.includes('حسن')
        );
        expect(foundUser).toBeDefined();
      }
    });

    test('should filter by active status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?isActive=true&limit=3',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      body.data.users.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    test('should include required user fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?limit=1',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      const user = body.data.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user).toHaveProperty('isActive');
      expect(user).toHaveProperty('isVerified');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
      
      // New fields from Persian data
      expect(user).toHaveProperty('phoneNumber');
      expect(user).toHaveProperty('age');
      expect(user).toHaveProperty('gender');
      expect(user).toHaveProperty('address');
      expect(user).toHaveProperty('birthday');
      
      // Should not include password
      expect(user).not.toHaveProperty('password');
    });
  });

  describe('GET /api/users/:id - Get User by ID', () => {
    test('should return user by valid ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(testUser.id);
      expect(body.data.email).toBe(testUser.email);
      expect(body.data).not.toHaveProperty('password');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/non-existent-id',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('User not found');
    });
  });

  describe('PUT /api/users/:id - Update User', () => {
    test('should allow user to update their own profile', async () => {
      const updateData = {
        firstName: 'علی تست',
        lastName: 'کاربر آزمایش',
        phoneNumber: '+9809100000000',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.success).toBe(true);
      expect(body.message).toBe('User updated successfully');
      expect(body.data.firstName).toBe('علی تست');
      expect(body.data.lastName).toBe('کاربر آزمایش');
      expect(body.data.phoneNumber).toBe('+9809100000000');
    });

    test('should calculate age when birthday is updated', async () => {
      const birthday = new Date('1990-01-01').toISOString();
      const updateData = { birthday };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.data.birthday).toBe(birthday);
      expect(body.data.age).toBeGreaterThan(30);
    });

    test('should accept valid Persian gender values', async () => {
      const genders = ['مرد', 'زن', 'ترجیح می‌دهم نگویم'];
      
      for (const gender of genders) {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/users/${testUser.id}`,
          headers: {
            authorization: `Bearer ${userToken}`,
            'content-type': 'application/json',
          },
          payload: { gender },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.data.gender).toBe(gender);
      }
    });

    test('should reject invalid gender values', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: { gender: 'invalid-gender' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle empty update payload', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle special characters in search', async () => {
      const searchTerms = ['محمد@test', 'علی123', '!@#$%'];
      
      for (const searchTerm of searchTerms) {
        const response = await app.inject({
          method: 'GET',
          url: `/api/users?search=${encodeURIComponent(searchTerm)}`,
          headers: {
            authorization: `Bearer ${userToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
      }
    });

    test('should handle very large page numbers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?page=999999',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.users).toHaveLength(0);
    });

    test('should return consistent timestamps', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?limit=1',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Security', () => {
    test('should not expose password in any response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.data).not.toHaveProperty('password');
      expect(JSON.stringify(body)).not.toContain('password');
    });
  });
});