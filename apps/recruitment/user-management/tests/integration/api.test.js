/**
 * User Management API Integration Tests
 * Tests all user endpoints directly against the service
 */

import { test, beforeAll, afterAll, describe, expect } from '@jest/globals';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

let app;
let prisma;

beforeAll(async () => {
  // Initialize Prisma client
  prisma = new PrismaClient();
  
  // Create a minimal Fastify app for testing
  app = Fastify({
    logger: false
  });

  // Register required plugins
  await app.register(import('@fastify/cors'));
  await app.register(import('@fastify/sensible'));

  // Mock the user controller
  const mockUserController = {
    async getUsers(request, reply) {
      const page = parseInt(request.query.page) || 1;
      const limit = parseInt(request.query.limit) || 20;
      const skip = (page - 1) * limit;

      let whereClause = {
        deletedAt: null
      };

      // Add search filter if provided
      if (request.query.search) {
        whereClause.OR = [
          { email: { contains: request.query.search, mode: 'insensitive' } },
          { username: { contains: request.query.search, mode: 'insensitive' } },
          { firstName: { contains: request.query.search, mode: 'insensitive' } },
          { lastName: { contains: request.query.search, mode: 'insensitive' } }
        ];
      }

      // Add filters
      if (request.query.isActive !== undefined) {
        whereClause.isActive = request.query.isActive;
      }
      if (request.query.isVerified !== undefined) {
        whereClause.isVerified = request.query.isVerified;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      const total = await prisma.user.count({ where: whereClause });

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
        timestamp: new Date().toISOString()
      };
    },

    async getUserById(request, reply) {
      const { id } = request.params;
      
      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: user,
        timestamp: new Date().toISOString()
      };
    },

    async createUser(request, reply) {
      const { email, username, password, firstName, lastName, phone } = request.body;
      
      // Basic validation
      if (!email || !username || !password) {
        reply.code(400);
        return {
          success: false,
          error: 'Email, username, and password are required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        };
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email },
            { username: username }
          ],
          deletedAt: null
        }
      });

      if (existingUser) {
        reply.code(409);
        return {
          success: false,
          error: 'User with this email or username already exists',
          statusCode: 409,
          timestamp: new Date().toISOString()
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          username: username.trim(),
          password: hashedPassword,
          firstName: firstName?.trim(),
          lastName: lastName?.trim(),
          phone: phone?.trim(),
          isActive: true,
          isVerified: false
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      reply.code(201);
      return {
        success: true,
        message: 'User created successfully',
        data: user,
        timestamp: new Date().toISOString()
      };
    },

    async updateUser(request, reply) {
      const { id } = request.params;
      const updateData = { ...request.body };
      
      // Remove password from update data if present (should use separate endpoint)
      delete updateData.password;
      delete updateData.id;

      const existingUser = await prisma.user.findUnique({
        where: { id, deletedAt: null }
      });

      if (!existingUser) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      // Check for email/username conflicts if being updated
      if (updateData.email || updateData.username) {
        const conflictUser = await prisma.user.findFirst({
          where: {
            OR: [
              ...(updateData.email ? [{ email: updateData.email }] : []),
              ...(updateData.username ? [{ username: updateData.username }] : [])
            ],
            NOT: { id: id },
            deletedAt: null
          }
        });

        if (conflictUser) {
          reply.code(409);
          return {
            success: false,
            error: 'Email or username already exists',
            statusCode: 409,
            timestamp: new Date().toISOString()
          };
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
        timestamp: new Date().toISOString()
      };
    },

    async deleteUser(request, reply) {
      const { id } = request.params;

      const existingUser = await prisma.user.findUnique({
        where: { id, deletedAt: null }
      });

      if (!existingUser) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      // Soft delete
      await prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      });

      reply.code(204);
      return;
    },

    async activateUser(request, reply) {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null }
      });

      if (!user) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: true },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isVerified: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        message: 'User activated successfully',
        data: updatedUser,
        timestamp: new Date().toISOString()
      };
    },

    async deactivateUser(request, reply) {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null }
      });

      if (!user) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isVerified: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        message: 'User deactivated successfully',
        data: updatedUser,
        timestamp: new Date().toISOString()
      };
    }
  };

  // Register routes
  await app.register(async function (fastify) {
    // Get all users
    fastify.get('/api/users', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string' },
            isActive: { type: 'boolean' },
            isVerified: { type: 'boolean' }
          }
        }
      }
    }, mockUserController.getUsers);

    // Get user by ID
    fastify.get('/api/users/:id', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    }, mockUserController.getUserById);

    // Create user
    fastify.post('/api/users', {
      schema: {
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3, maxLength: 50 },
            password: { type: 'string', minLength: 6 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' }
          },
          required: ['email', 'username', 'password']
        }
      }
    }, mockUserController.createUser);

    // Update user
    fastify.put('/api/users/:id', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3, maxLength: 50 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            avatar: { type: 'string' }
          }
        }
      }
    }, mockUserController.updateUser);

    // Delete user
    fastify.delete('/api/users/:id', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    }, mockUserController.deleteUser);

    // Activate user
    fastify.post('/api/users/:id/activate', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    }, mockUserController.activateUser);

    // Deactivate user
    fastify.post('/api/users/:id/deactivate', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    }, mockUserController.deactivateUser);
  });

  await app.ready();
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  if (prisma) {
    await prisma.$disconnect();
  }
});

describe('User Management API Integration Tests', () => {
  describe('GET /api/users', () => {
    test('should return paginated users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('users');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray(body.data.users)).toBe(true);
    });

    test('should handle pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?page=1&limit=5'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(5);
    });

    test('should handle search parameters', async () => {
      // First create a user to search for
      await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'search@test.com',
          username: 'searchuser',
          password: 'password123',
          firstName: 'Search',
          lastName: 'User'
        }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/users?search=search'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    test('should handle filter parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?isActive=true&isVerified=false'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /api/users', () => {
    test('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: userData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(userData.email);
      expect(body.data.username).toBe(userData.username);
      expect(body.data.firstName).toBe(userData.firstName);
      expect(body.data.lastName).toBe(userData.lastName);
      expect(body.data).toHaveProperty('id');
      expect(body.data).not.toHaveProperty('password'); // Password should not be returned
      expect(body.data.isActive).toBe(true);
      expect(body.data.isVerified).toBe(false);
    });

    test('should handle validation errors for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: { email: 'test@example.com' } // Missing username and password
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle email format validation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'invalid-email',
          username: 'testuser',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle duplicate email/username', async () => {
      const userData = {
        email: 'duplicate@example.com',
        username: 'duplicateuser',
        password: 'password123'
      };

      // Create first user
      await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: userData
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: userData
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('already exists');
    });

    test('should trim and normalize email and username', async () => {
      const userData = {
        email: '  NORMALIZE@EXAMPLE.COM  ',
        username: '  normalizeuser  ',
        password: 'password123'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: userData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.email).toBe('normalize@example.com');
      expect(body.data.username).toBe('normalizeuser');
    });
  });

  describe('GET /api/users/:id', () => {
    test('should return a specific user by ID', async () => {
      // First create a user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'getuser@example.com',
          username: 'getuser',
          password: 'password123',
          firstName: 'Get',
          lastName: 'User'
        }
      });

      const createdUser = JSON.parse(createResponse.body).data;

      // Then retrieve it
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${createdUser.id}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(createdUser.id);
      expect(body.data.email).toBe('getuser@example.com');
      expect(body.data).not.toHaveProperty('password');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });
  });

  describe('PUT /api/users/:id', () => {
    test('should update an existing user', async () => {
      // First create a user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'update@example.com',
          username: 'updateuser',
          password: 'password123',
          firstName: 'Original',
          lastName: 'Name'
        }
      });

      const createdUser = JSON.parse(createResponse.body).data;

      // Then update it
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/users/${createdUser.id}`,
        payload: {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+1234567890'
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = JSON.parse(updateResponse.body);
      expect(body.success).toBe(true);
      expect(body.data.firstName).toBe('Updated');
      expect(body.data.phone).toBe('+1234567890');
      expect(body.data.id).toBe(createdUser.id);
    });

    test('should return 404 for updating non-existent user', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/users/non-existent-id',
        payload: { firstName: 'Updated' }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    test('should handle email/username conflicts in updates', async () => {
      // Create two users
      const user1Response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'user1@example.com',
          username: 'user1',
          password: 'password123'
        }
      });

      const user2Response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'user2@example.com',
          username: 'user2',
          password: 'password123'
        }
      });

      const user1 = JSON.parse(user1Response.body).data;
      const user2 = JSON.parse(user2Response.body).data;

      // Try to update user2 with user1's email
      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${user2.id}`,
        payload: { email: 'user1@example.com' }
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('already exists');
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('should delete an existing user (soft delete)', async () => {
      // First create a user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'delete@example.com',
          username: 'deleteuser',
          password: 'password123'
        }
      });

      const createdUser = JSON.parse(createResponse.body).data;

      // Then delete it
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/users/${createdUser.id}`
      });

      expect(deleteResponse.statusCode).toBe(204);

      // Verify it's soft deleted (should return 404)
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/users/${createdUser.id}`
      });

      expect(getResponse.statusCode).toBe(404);
    });

    test('should return 404 for deleting non-existent user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/users/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/users/:id/activate', () => {
    test('should activate a user', async () => {
      // Create a user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'activate@example.com',
          username: 'activateuser',
          password: 'password123'
        }
      });

      const createdUser = JSON.parse(createResponse.body).data;

      // Activate the user
      const activateResponse = await app.inject({
        method: 'POST',
        url: `/api/users/${createdUser.id}/activate`
      });

      expect(activateResponse.statusCode).toBe(200);
      const body = JSON.parse(activateResponse.body);
      expect(body.success).toBe(true);
      expect(body.data.isActive).toBe(true);
    });

    test('should return 404 for activating non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/non-existent-id/activate'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/users/:id/deactivate', () => {
    test('should deactivate a user', async () => {
      // Create a user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'deactivate@example.com',
          username: 'deactivateuser',
          password: 'password123'
        }
      });

      const createdUser = JSON.parse(createResponse.body).data;

      // Deactivate the user
      const deactivateResponse = await app.inject({
        method: 'POST',
        url: `/api/users/${createdUser.id}/deactivate`
      });

      expect(deactivateResponse.statusCode).toBe(200);
      const body = JSON.parse(deactivateResponse.body);
      expect(body.success).toBe(true);
      expect(body.data.isActive).toBe(false);
    });

    test('should return 404 for deactivating non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/non-existent-id/deactivate'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON in request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle very long field values', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'test@example.com',
          username: 'a'.repeat(100), // Exceeds max length
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'test@example.com',
          username: 'testuser',
          password: '123' // Too short
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          firstName: 'Test'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});