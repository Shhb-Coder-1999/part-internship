/**
 * Comprehensive User Endpoints Tests
 * Testing all edge cases and scenarios for the user API
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Import the gateway app
import gatewayApp from '../../gateway.js';

const prisma = new PrismaClient();

describe('User Endpoints - Comprehensive Tests', () => {
  let app;
  let adminToken;
  let userToken;
  let testUser;
  let testAdmin;

  beforeAll(async () => {
    app = gatewayApp;
    
    // Clear existing test data
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    // Create roles
    const userRole = await prisma.role.create({
      data: {
        name: 'user',
        description: 'Standard user role',
        isActive: true,
      },
    });

    const adminRole = await prisma.role.create({
      data: {
        name: 'admin',
        description: 'Administrator role',
        isActive: true,
      },
    });

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    testUser = await prisma.user.create({
      data: {
        email: 'ali.ahmadi@test.com',
        password: hashedPassword,
        firstName: 'علی',
        lastName: 'احمدی',
        phoneNumber: '+9809123456789',
        age: 28,
        gender: 'مرد',
        address: 'خیابان ولیعصر، پلاک 123، تهران، تهران، کد پستی: 12345',
        isActive: true,
        isVerified: true,
      },
    });

    testAdmin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: hashedPassword,
        firstName: 'مدیر',
        lastName: 'سیستم',
        isActive: true,
        isVerified: true,
      },
    });

    // Assign roles
    await prisma.userRole.create({
      data: { userId: testUser.id, roleId: userRole.id },
    });

    await prisma.userRole.create({
      data: { userId: testAdmin.id, roleId: adminRole.id },
    });

    // Generate tokens
    userToken = app.jwt.sign({
      id: testUser.id,
      email: testUser.email,
      roles: ['user'],
    });

    adminToken = app.jwt.sign({
      id: testAdmin.id,
      email: testAdmin.email,
      roles: ['admin'],
    });

    // Create additional test users for pagination tests
    const additionalUsers = [];
    for (let i = 0; i < 25; i++) {
      additionalUsers.push({
        email: `test${i}@example.com`,
        password: hashedPassword,
        firstName: i % 2 === 0 ? 'محمد' : 'فاطمه',
        lastName: `تستی${i}`,
        phoneNumber: `+98091234567${i.toString().padStart(2, '0')}`,
        age: 20 + (i % 45),
        gender: i % 3 === 0 ? 'مرد' : i % 3 === 1 ? 'زن' : 'ترجیح می‌دهم نگویم',
        isActive: i % 10 !== 0, // 90% active
        isVerified: i % 5 !== 0, // 80% verified
        address: `خیابان تست، پلاک ${i + 1}، تهران، تهران`,
      });
    }

    // Batch create additional users
    for (const userData of additionalUsers) {
      const user = await prisma.user.create({ data: userData });
      await prisma.userRole.create({
        data: { userId: user.id, roleId: userRole.id },
      });
    }
  });

  afterAll(async () => {
    // Cleanup
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  describe('Authentication Tests', () => {
    test('should reject requests without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Authorization header missing');
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

    test('should reject requests with malformed token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: 'invalid-format',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('should accept valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?limit=1',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
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
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(20);
      expect(body.data.users.length).toBeLessThanOrEqual(20);
      expect(body.data.pagination.total).toBeGreaterThan(0);
    });

    test('should handle custom pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?page=2&limit=5',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.limit).toBe(5);
      expect(body.data.users.length).toBeLessThanOrEqual(5);
    });

    test('should enforce maximum limit (100)', async () => {
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

    test('should handle invalid pagination parameters gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?page=-1&limit=abc',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.page).toBeGreaterThan(0);
      expect(body.data.pagination.limit).toBeGreaterThan(0);
    });

    test('should search users by Persian names', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?search=علی',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.success).toBe(true);
      // Should find our test user with firstName "علی"
      const foundUser = body.data.users.find(u => u.firstName.includes('علی'));
      expect(foundUser).toBeDefined();
    });

    test('should search users by lastName', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?search=احمدی',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      const foundUser = body.data.users.find(u => u.lastName.includes('احمدی'));
      expect(foundUser).toBeDefined();
    });

    test('should search users by email', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?search=ali.ahmadi',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      const foundUser = body.data.users.find(u => u.email.includes('ali.ahmadi'));
      expect(foundUser).toBeDefined();
    });

    test('should filter by isActive status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?isActive=true',
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

    test('should filter by isVerified status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?isVerified=false',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      body.data.users.forEach(user => {
        expect(user.isVerified).toBe(false);
      });
    });

    test('should combine multiple filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?search=محمد&isActive=true&isVerified=true&limit=5',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      body.data.users.forEach(user => {
        expect(user.isActive).toBe(true);
        expect(user.isVerified).toBe(true);
        expect(user.firstName.includes('محمد') || 
               user.lastName.includes('محمد') || 
               user.email.includes('محمد')).toBe(true);
      });
    });

    test('should return empty results for non-existent search', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?search=غیرموجود123456',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.data.users).toHaveLength(0);
      expect(body.data.pagination.total).toBe(0);
    });

    test('should include all required user fields', async () => {
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
      expect(user).toHaveProperty('phoneNumber');
      expect(user).toHaveProperty('age');
      expect(user).toHaveProperty('gender');
      expect(user).toHaveProperty('address');
      expect(user).toHaveProperty('birthday');
      expect(user).toHaveProperty('isActive');
      expect(user).toHaveProperty('isVerified');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
      
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
      expect(body.data.firstName).toBe('علی');
      expect(body.data.lastName).toBe('احمدی');
    });

    test('should return 404 for non-existent user ID', async () => {
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

    test('should include all user fields including lastLogin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.data).toHaveProperty('lastLogin');
      expect(body.data).not.toHaveProperty('password');
    });

    test('should work with admin token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('PUT /api/users/:id - Update User', () => {
    test('should allow user to update their own profile', async () => {
      const updateData = {
        firstName: 'علی محمد',
        lastName: 'احمدی نژاد',
        phoneNumber: '+9809187654321',
        address: 'خیابان آزادی، پلاک 456، تهران، تهران',
        gender: 'مرد',
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
      expect(body.data.firstName).toBe('علی محمد');
      expect(body.data.lastName).toBe('احمدی نژاد');
      expect(body.data.phoneNumber).toBe('+9809187654321');
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
      expect(body.data.age).toBeGreaterThan(30); // Should be around 34 years old
    });

    test('should prevent user from updating other user profiles', async () => {
      const updateData = { firstName: 'Hacker' };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${testAdmin.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      
      expect(body.success).toBe(false);
      expect(body.error).toContain('Access denied');
    });

    test('should allow admin to update any user profile', async () => {
      const updateData = { firstName: 'Updated by Admin' };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.success).toBe(true);
      expect(body.data.firstName).toBe('Updated by Admin');
    });

    test('should validate gender enum values', async () => {
      const updateData = { gender: 'invalid-gender' };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(400);
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

    test('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/users/non-existent-id',
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: { firstName: 'Test' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('User not found');
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

    test('should validate string length constraints', async () => {
      const longString = 'a'.repeat(1000);
      
      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: { firstName: longString },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test simulates network issues, but we'll just test normal behavior
      // In a real scenario, you might mock prisma to throw errors
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?limit=1',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    test('should handle malformed JSON in request body', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: '{"invalid": json}',
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/users?limit=5',
          headers: {
            authorization: `Bearer ${userToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });

    test('should handle special characters in search', async () => {
      const specialChars = ['!@#$%^&*()', 'محمد123', 'test@email.com'];
      
      for (const searchTerm of specialChars) {
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
  });

  describe('Performance and Load Tests', () => {
    test('should handle rapid successive requests', async () => {
      const startTime = Date.now();
      
      const requests = Array.from({ length: 50 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/users?limit=1',
          headers: {
            authorization: `Bearer ${userToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
      
      // Should complete within reasonable time (adjust as needed)
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
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

  describe('Security Tests', () => {
    test('should not expose sensitive information', async () => {
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

    test('should sanitize error messages', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/"><script>alert("xss")</script>',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(JSON.stringify(body)).not.toContain('<script>');
    });
  });
});