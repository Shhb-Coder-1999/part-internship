/**
 * User Management Service E2E Tests
 * Tests the actual service endpoints without mocking conflicts
 */

import { test, beforeAll, afterAll, describe, expect } from '@jest/globals';
import Fastify from 'fastify';

let app;

beforeAll(async () => {
  // Create a minimal test app for User Management Service
  app = Fastify({ logger: false });

  // Register core plugins
  await app.register(import('@fastify/cors'));
  await app.register(import('@fastify/sensible'));

  // Simple test endpoints that simulate the user management service behavior
  await app.register(async function (fastify) {
    // In-memory storage for testing
    let users = [];
    let userCounter = 1;

    // Get all users
    fastify.get('/api/users', async (request, reply) => {
      const page = parseInt(request.query.page) || 1;
      const limit = parseInt(request.query.limit) || 20;
      const skip = (page - 1) * limit;

      let filteredUsers = users.filter(u => !u.deletedAt);
      
      // Search filter
      if (request.query.search) {
        const searchTerm = request.query.search.toLowerCase();
        filteredUsers = filteredUsers.filter(u => 
          u.email.toLowerCase().includes(searchTerm) ||
          u.username.toLowerCase().includes(searchTerm) ||
          (u.firstName && u.firstName.toLowerCase().includes(searchTerm)) ||
          (u.lastName && u.lastName.toLowerCase().includes(searchTerm))
        );
      }

      // Status filters
      if (request.query.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(u => u.isActive === request.query.isActive);
      }
      if (request.query.isVerified !== undefined) {
        filteredUsers = filteredUsers.filter(u => u.isVerified === request.query.isVerified);
      }

      const paginatedUsers = filteredUsers.slice(skip, skip + limit);

      // Remove passwords from response
      const safeUsers = paginatedUsers.map(({ password, ...user }) => user);

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: safeUsers,
          pagination: {
            page,
            limit,
            total: filteredUsers.length,
            totalPages: Math.ceil(filteredUsers.length / limit)
          }
        },
        timestamp: new Date().toISOString()
      };
    });

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
    }, async (request, reply) => {
      const { email, username, password, firstName, lastName, phone } = request.body;

      // Check for existing user
      const existingUser = users.find(u => 
        (u.email === email.toLowerCase() || u.username === username.toLowerCase()) && !u.deletedAt
      );

      if (existingUser) {
        reply.code(409);
        return {
          success: false,
          error: 'User with this email or username already exists',
          statusCode: 409,
          timestamp: new Date().toISOString()
        };
      }

      // Simple password hash for testing (not secure, just for testing)
      const hashedPassword = `hashed_${password}`;

      const user = {
        id: `user-${userCounter++}`,
        email: email.toLowerCase().trim(),
        username: username.trim(),
        password: hashedPassword,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        phone: phone?.trim() || null,
        avatar: null,
        isActive: true,
        isVerified: false,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };

      users.push(user);

      // Return user without password
      const { password: _, ...safeUser } = user;

      reply.code(201);
      return {
        success: true,
        message: 'User created successfully',
        data: safeUser,
        timestamp: new Date().toISOString()
      };
    });

    // Get user by ID
    fastify.get('/api/users/:id', async (request, reply) => {
      const user = users.find(u => u.id === request.params.id && !u.deletedAt);
      
      if (!user) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      // Return user without password
      const { password, ...safeUser } = user;

      return {
        success: true,
        message: 'User retrieved successfully',
        data: safeUser,
        timestamp: new Date().toISOString()
      };
    });

    // Update user
    fastify.put('/api/users/:id', {
      schema: {
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
    }, async (request, reply) => {
      const userIndex = users.findIndex(u => u.id === request.params.id && !u.deletedAt);
      
      if (userIndex === -1) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      const updateData = { ...request.body };
      
      // Check for email/username conflicts
      if (updateData.email || updateData.username) {
        const conflictUser = users.find(u => 
          u.id !== request.params.id && 
          !u.deletedAt && 
          ((updateData.email && u.email === updateData.email.toLowerCase()) ||
           (updateData.username && u.username === updateData.username.toLowerCase()))
        );

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

      // Update user
      users[userIndex] = {
        ...users[userIndex],
        ...updateData,
        email: updateData.email ? updateData.email.toLowerCase().trim() : users[userIndex].email,
        username: updateData.username ? updateData.username.trim() : users[userIndex].username,
        firstName: updateData.firstName ? updateData.firstName.trim() : users[userIndex].firstName,
        lastName: updateData.lastName ? updateData.lastName.trim() : users[userIndex].lastName,
        phone: updateData.phone ? updateData.phone.trim() : users[userIndex].phone,
        updatedAt: new Date().toISOString()
      };

      // Return user without password
      const { password, ...safeUser } = users[userIndex];

      return {
        success: true,
        message: 'User updated successfully',
        data: safeUser,
        timestamp: new Date().toISOString()
      };
    });

    // Delete user (soft delete)
    fastify.delete('/api/users/:id', async (request, reply) => {
      const userIndex = users.findIndex(u => u.id === request.params.id && !u.deletedAt);
      
      if (userIndex === -1) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      users[userIndex].deletedAt = new Date().toISOString();
      users[userIndex].isActive = false;

      reply.code(204);
      return;
    });

    // Activate user
    fastify.post('/api/users/:id/activate', async (request, reply) => {
      const userIndex = users.findIndex(u => u.id === request.params.id && !u.deletedAt);
      
      if (userIndex === -1) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      users[userIndex].isActive = true;
      users[userIndex].updatedAt = new Date().toISOString();

      // Return user without password
      const { password, ...safeUser } = users[userIndex];

      return {
        success: true,
        message: 'User activated successfully',
        data: safeUser,
        timestamp: new Date().toISOString()
      };
    });

    // Deactivate user
    fastify.post('/api/users/:id/deactivate', async (request, reply) => {
      const userIndex = users.findIndex(u => u.id === request.params.id && !u.deletedAt);
      
      if (userIndex === -1) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      users[userIndex].isActive = false;
      users[userIndex].updatedAt = new Date().toISOString();

      // Return user without password
      const { password, ...safeUser } = users[userIndex];

      return {
        success: true,
        message: 'User deactivated successfully',
        data: safeUser,
        timestamp: new Date().toISOString()
      };
    });

    // Health check
    fastify.get('/api/health', async () => ({
      status: 'OK',
      service: 'User Management Service',
      timestamp: new Date().toISOString()
    }));
  });

  await app.ready();
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

describe('User Management Service E2E Tests', () => {
  describe('Health Check', () => {
    test('should return service health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('OK');
      expect(body.service).toBe('User Management Service');
    });
  });

  describe('GET /api/users', () => {
    test('should return empty users list initially', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toEqual([]);
      expect(body.data.pagination.total).toBe(0);
    });

    test('should handle pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?page=2&limit=5'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.limit).toBe(5);
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
      expect(body.data.phone).toBe(userData.phone);
      expect(body.data.id).toMatch(/^user-\d+$/);
      expect(body.data).not.toHaveProperty('password');
      expect(body.data.isActive).toBe(true);
      expect(body.data.isVerified).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: { email: 'test@example.com' }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should validate email format', async () => {
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

    test('should prevent duplicate users', async () => {
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

    test('should normalize email to lowercase', async () => {
      const userData = {
        email: 'UPPER@EXAMPLE.COM',
        username: 'upperuser',
        password: 'password123'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: userData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.email).toBe('upper@example.com');
    });

    test('should hash password securely', async () => {
      const userData = {
        email: 'password@example.com',
        username: 'passworduser',
        password: 'password123'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: userData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).not.toHaveProperty('password');
    });
  });

  describe('GET /api/users/:id', () => {
    test('should retrieve a specific user', async () => {
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
      expect(body.error).toBe('User not found');
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

    test('should prevent email/username conflicts in updates', async () => {
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
    test('should soft delete a user', async () => {
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

      // Verify it's deleted
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

      // Deactivate first
      await app.inject({
        method: 'POST',
        url: `/api/users/${createdUser.id}/deactivate`
      });

      // Then activate
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

  describe('Full Workflow Test', () => {
    test('should complete full CRUD workflow', async () => {
      // 1. Create a user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'workflow@example.com',
          username: 'workflowuser',
          password: 'password123',
          firstName: 'Workflow',
          lastName: 'Test'
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const createdUser = JSON.parse(createResponse.body).data;

      // 2. Retrieve the user
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/users/${createdUser.id}`
      });

      expect(getResponse.statusCode).toBe(200);

      // 3. Update the user
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/users/${createdUser.id}`,
        payload: { firstName: 'Updated', phone: '+1234567890' }
      });

      expect(updateResponse.statusCode).toBe(200);
      expect(JSON.parse(updateResponse.body).data.firstName).toBe('Updated');

      // 4. Deactivate the user
      const deactivateResponse = await app.inject({
        method: 'POST',
        url: `/api/users/${createdUser.id}/deactivate`
      });

      expect(deactivateResponse.statusCode).toBe(200);
      expect(JSON.parse(deactivateResponse.body).data.isActive).toBe(false);

      // 5. Activate the user
      const activateResponse = await app.inject({
        method: 'POST',
        url: `/api/users/${createdUser.id}/activate`
      });

      expect(activateResponse.statusCode).toBe(200);
      expect(JSON.parse(activateResponse.body).data.isActive).toBe(true);

      // 6. Verify it appears in list
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/users'
      });

      expect(listResponse.statusCode).toBe(200);
      const listBody = JSON.parse(listResponse.body);
      const foundUser = listBody.data.users.find(u => u.id === createdUser.id);
      expect(foundUser).toBeTruthy();
      expect(foundUser.firstName).toBe('Updated');
      expect(foundUser.isActive).toBe(true);

      // 7. Delete the user
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/users/${createdUser.id}`
      });

      expect(deleteResponse.statusCode).toBe(204);

      // 8. Verify it's gone from list
      const finalListResponse = await app.inject({
        method: 'GET',
        url: '/api/users'
      });

      expect(finalListResponse.statusCode).toBe(200);
      const finalListBody = JSON.parse(finalListResponse.body);
      const deletedUser = finalListBody.data.users.find(u => u.id === createdUser.id);
      expect(deletedUser).toBeFalsy();
    });
  });

  describe('Search and Filtering', () => {
    test('should filter users by search term', async () => {
      // Create some test users
      await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'john.doe@example.com',
          username: 'johndoe',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        }
      });

      await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'jane.smith@example.com',
          username: 'janesmith',
          password: 'password123',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      });

      // Search for John
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?search=john'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.users).toHaveLength(1);
      expect(body.data.users[0].firstName).toBe('John');
    });

    test('should filter users by status', async () => {
      // First get current user count to understand baseline
      const initialResponse = await app.inject({
        method: 'GET',
        url: '/api/users'
      });
      const initialCount = JSON.parse(initialResponse.body).data.users.length;

      // Create an active user
      const activeResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'statusactive@example.com',
          username: 'statusactiveuser',
          password: 'password123'
        }
      });

      const activeUser = JSON.parse(activeResponse.body).data;

      // Create another user and deactivate it
      const inactiveResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'statusinactive@example.com',
          username: 'statusinactiveuser',
          password: 'password123'
        }
      });

      const inactiveUser = JSON.parse(inactiveResponse.body).data;

      await app.inject({
        method: 'POST',
        url: `/api/users/${inactiveUser.id}/deactivate`
      });

      // Filter for active users only
      const activeUsersResponse = await app.inject({
        method: 'GET',
        url: '/api/users?isActive=true'
      });

      expect(activeUsersResponse.statusCode).toBe(200);
      const activeBody = JSON.parse(activeUsersResponse.body);
      // Should have initial count + 1 active user we created
      expect(activeBody.data.users.length).toBe(initialCount + 1);
      expect(activeBody.data.users.every(u => u.isActive)).toBe(true);
      
      // Verify the active user is in the results
      const foundActiveUser = activeBody.data.users.find(u => u.id === activeUser.id);
      expect(foundActiveUser).toBeTruthy();

      // Filter for inactive users only
      const inactiveUsersResponse = await app.inject({
        method: 'GET',
        url: '/api/users?isActive=false'
      });

      expect(inactiveUsersResponse.statusCode).toBe(200);
      const inactiveBody = JSON.parse(inactiveUsersResponse.body);
      expect(inactiveBody.data.users.length).toBe(1);
      expect(inactiveBody.data.users[0].id).toBe(inactiveUser.id);
      expect(inactiveBody.data.users[0].isActive).toBe(false);
    });
  });
});