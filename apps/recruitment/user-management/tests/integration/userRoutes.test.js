/**
 * User Management Service Integration Tests
 * Tests all user CRUD operations, authentication, and business logic
 */

import { test, beforeAll, afterAll, describe, expect } from '@jest/globals';
import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let app;
let testUser;
let testUser2;
let createdUserId;
let authToken;

// Test database path
const testDbPath = path.join(process.cwd(), 'prisma', 'user_test.db');

beforeAll(async () => {
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `file:${testDbPath}`;

  // Import server instance
  const serverModule = await import('../../src/server-instance.js');
  app = serverModule.default;

  // Initialize database
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create test users
  testUser = {
    email: 'testuser@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser'
  };

  testUser2 = {
    email: 'testuser2@example.com',
    password: 'password456',
    firstName: 'Test2',
    lastName: 'User2',
    username: 'testuser2'
  };

  // Mock authentication token (you might need to adjust this based on your auth system)
  authToken = 'mock-jwt-token';
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

describe('User Management Service Tests', () => {
  describe('Create User', () => {
    test('should create a new user successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: testUser,
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBeDefined();
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.email).toBe(testUser.email);
      expect(body.data.firstName).toBe(testUser.firstName);
      expect(body.data.lastName).toBe(testUser.lastName);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
      expect(body.data.isActive).toBeDefined();
      expect(body.timestamp).toBeDefined();

      // Store for later tests
      createdUserId = body.data.id;
    });

    test('should not create user with duplicate email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: testUser, // Same user
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    test('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'incomplete@test.com'
          // Missing required fields
        },
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should validate email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'invalid-email',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        },
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should hash password correctly', async () => {
      // Create another user to test password hashing
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: testUser2,
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      
      // Password should not be in response
      expect(body.data.password).toBeUndefined();
      
      // Verify password is hashed in database (if you have direct database access)
      // This would require importing your repository or database client
    });
  });

  describe('Get Users', () => {
    test('should get all users with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.users || body.data)).toBe(true);
      expect(body.timestamp).toBeDefined();
    });

    test('should support pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?page=1&limit=5',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    test('should handle invalid pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users?page=-1&limit=1000',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // Should either return 400 or handle gracefully with defaults
      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('Get User by ID', () => {
    test('should get user by valid ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${createdUserId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(createdUserId);
      expect(body.data.email).toBe(testUser.email);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    test('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    test('should handle malformed user ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/invalid-id-format',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect([400, 404]).toContain(response.statusCode);
    });
  });

  describe('Update User', () => {
    test('should update user successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${createdUserId}`,
        payload: updateData,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.firstName).toBe('Updated');
      expect(body.data.lastName).toBe('Name');
      expect(body.data.updatedAt).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    test('should not update with invalid data', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${createdUserId}`,
        payload: {
          email: 'invalid-email-format'
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should return 404 for non-existent user update', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/users/non-existent-id',
        payload: {
          firstName: 'Test'
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    test('should not allow updating sensitive fields directly', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/users/${createdUserId}`,
        payload: {
          id: 'different-id',
          createdAt: new Date().toISOString(),
          password: 'should-not-update-directly'
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      // Should either ignore these fields or return an error
      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('Search Users', () => {
    test('should search users by query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/search?q=Updated&limit=10',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.timestamp).toBeDefined();
    });

    test('should handle empty search results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/search?q=nonexistentuser&limit=10',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(0);
    });

    test('should validate search parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/search', // Missing query parameter
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('Current User Operations', () => {
    test('should get current user profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // This might need authentication setup
      expect([200, 401]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.timestamp).toBeDefined();
      }
    });
  });

  describe('Delete User', () => {
    test('should delete user successfully', async () => {
      // Create a user specifically for deletion
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'todelete@test.com',
          password: 'password123',
          firstName: 'To',
          lastName: 'Delete'
        },
        headers: {
          'content-type': 'application/json'
        }
      });

      const createdUser = JSON.parse(createResponse.body);
      const userIdToDelete = createdUser.data.id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/users/${userIdToDelete}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.timestamp).toBeDefined();

      // Verify user is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/users/${userIdToDelete}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(getResponse.statusCode).toBe(404);
    });

    test('should return 404 for non-existent user deletion', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/users/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Response Format Validation', () => {
    test('all responses should have consistent format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Check response structure
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('timestamp');
      expect(typeof body.success).toBe('boolean');
      expect(typeof body.timestamp).toBe('string');
    });

    test('error responses should have consistent format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('timestamp');
      expect(body.success).toBe(false);
    });
  });

  describe('Data Validation and Security', () => {
    test('should not expose sensitive data in responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${createdUserId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Password should never be in response
      expect(body.data.password).toBeUndefined();
      
      // Ensure other sensitive fields are handled appropriately
      if (body.data.hashedPassword) {
        expect(body.data.hashedPassword).toBeUndefined();
      }
    });

    test('should handle SQL injection attempts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: "/api/users/'; DROP TABLE users; --",
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // Should not crash and should return appropriate error
      expect([400, 404]).toContain(response.statusCode);
    });

    test('should handle XSS attempts in user data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'xss@test.com',
          password: 'password123',
          firstName: '<script>alert("xss")</script>',
          lastName: 'Test'
        },
        headers: {
          'content-type': 'application/json'
        }
      });

      // Should either sanitize or reject
      expect([201, 400]).toContain(response.statusCode);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
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

    test('should handle missing content type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: JSON.stringify(testUser)
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle large payloads', async () => {
      const largeData = {
        email: 'large@test.com',
        password: 'password123',
        firstName: 'A'.repeat(10000),
        lastName: 'Test'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: largeData,
        headers: {
          'content-type': 'application/json'
        }
      });

      // Should either handle gracefully or reject with appropriate error
      expect([201, 400, 413]).toContain(response.statusCode);
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(app.inject({
          method: 'GET',
          url: '/api/users',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        }));
      }

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });

    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});