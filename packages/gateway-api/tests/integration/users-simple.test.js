/**
 * Simplified User Endpoints Tests
 * Basic tests to verify endpoints work correctly
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Import the gateway app
import gatewayApp from '../../gateway.js';

const prisma = new PrismaClient();

describe('User Endpoints - Simple Tests', () => {
  let app;
  let adminToken;
  let userToken;
  let testUser;

  beforeAll(async () => {
    app = gatewayApp;

    // Create a test user and admin for authentication
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create user role if it doesn't exist
    let userRole = await prisma.role.findUnique({
      where: { name: 'user' },
    });

    if (!userRole) {
      userRole = await prisma.role.create({
        data: {
          name: 'user',
          description: 'Standard user role',
          isActive: true,
        },
      });
    }

    // Create admin role if it doesn't exist
    let adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'admin',
          description: 'Administrator role',
          isActive: true,
        },
      });
    }

    // Create test user if it doesn't exist
    let existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!existingUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          firstName: 'علی',
          lastName: 'احمدی',
          phoneNumber: '+9809123456789',
          age: 28,
          gender: 'مرد',
          address: 'خیابان ولیعصر، پلاک 123، تهران، تهران',
          isActive: true,
          isVerified: true,
        },
      });

      // Assign user role
      await prisma.userRole.create({
        data: { userId: testUser.id, roleId: userRole.id },
      });
    } else {
      testUser = existingUser;
    }

    // Create test admin if it doesn't exist
    let existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });

    let testAdmin;
    if (!existingAdmin) {
      testAdmin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          password: hashedPassword,
          firstName: 'مدیر',
          lastName: 'سیستم',
          isActive: true,
          isVerified: true,
        },
      });

      // Assign admin role
      await prisma.userRole.create({
        data: { userId: testAdmin.id, roleId: adminRole.id },
      });
    }

    // Generate tokens
    userToken = app.jwt.sign({
      id: testUser.id,
      email: testUser.email,
      roles: ['user'],
    });

    adminToken = app.jwt.sign({
      id: testAdmin ? testAdmin.id : existingAdmin.id,
      email: testAdmin ? testAdmin.email : existingAdmin.email,
      roles: ['admin'],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
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
    });

    test('should reject requests without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
      });

      expect(response.statusCode).toBe(401);
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
    });
  });

  describe('PUT /api/users/:id - Update User', () => {
    test('should allow user to update their own profile', async () => {
      const updateData = {
        firstName: 'علی محمد',
        lastName: 'احمدی نژاد',
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
      expect(body.data.firstName).toBe('علی محمد');
      expect(body.data.lastName).toBe('احمدی نژاد');
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
      const updateData = { gender: 'زن' };

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
      expect(body.data.gender).toBe('زن');
    });
  });

  describe('Authentication and Authorization', () => {
    test('should reject invalid tokens', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('should work with admin token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?limit=1',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Security', () => {
    test('should not expose password in responses', async () => {
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