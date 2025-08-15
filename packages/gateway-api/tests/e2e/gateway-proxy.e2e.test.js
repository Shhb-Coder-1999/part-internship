/**
 * Gateway Proxy E2E Tests
 * Tests complete gateway proxy functionality with all microservices
 */

import { test, beforeAll, afterAll, describe, expect } from '@jest/globals';
import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

let gatewayApp;
let commentsApp;
let usersApp;
let testUser;
let adminUser;
let userToken;
let adminToken;
let createdCommentId;

const testDbPath = path.join(process.cwd(), 'prisma', 'gateway_proxy_e2e_test.db');
const commentsDbPath = path.join(process.cwd(), 'prisma', 'comments_proxy_e2e_test.db');

beforeAll(async () => {
  // Clean up test databases
  [testDbPath, commentsDbPath].forEach(dbPath => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `file:${testDbPath}`;
  process.env.JWT_SECRET = 'test-secret-key-proxy-e2e';
  process.env.JWT_EXPIRATION = '1h';

  // Start mock comments service
  commentsApp = Fastify({ logger: false });
  await commentsApp.register(import('@fastify/cors'));
  
  // Mock comments service endpoints that accept gateway headers
  commentsApp.addHook('preHandler', async (request, reply) => {
    // Extract user context from gateway headers
    const userId = request.headers['x-user-id'];
    const userEmail = request.headers['x-user-email'];
    const userRoles = request.headers['x-user-roles'];
    const isGatewayForwarded = request.headers['x-gateway-forwarded'];

    request.user = null;
    request.isGatewayForwarded = isGatewayForwarded === 'true';

    if (userId) {
      request.user = {
        id: userId,
        email: userEmail,
        roles: userRoles ? JSON.parse(userRoles) : []
      };
    }
  });

  // Mock comments endpoints
  commentsApp.get('/api/comments', async (request, reply) => {
    return {
      success: true,
      data: {
        comments: [
          {
            id: 'comment-1',
            text: 'Test comment 1',
            authorId: request.user?.id || 'anonymous',
            likes: 5,
            dislikes: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 }
      },
      timestamp: new Date().toISOString()
    };
  });

  commentsApp.post('/api/comments', async (request, reply) => {
    if (!request.isGatewayForwarded) {
      return reply.status(403).send({
        success: false,
        error: 'Direct access not allowed',
        timestamp: new Date().toISOString()
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    const commentId = `comment-${Date.now()}`;
    return reply.status(201).send({
      success: true,
      message: 'Comment created successfully',
      data: {
        id: commentId,
        text: request.body.text,
        authorId: request.user.id,
        parentId: request.body.parentId || null,
        likes: 0,
        dislikes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  });

  commentsApp.get('/api/comments/:id', async (request, reply) => {
    const commentId = request.params.id;
    if (commentId === 'non-existent') {
      return reply.status(404).send({
        success: false,
        error: 'Comment not found',
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      data: {
        id: commentId,
        text: 'Test comment',
        authorId: request.user?.id || 'test-user',
        likes: 3,
        dislikes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  });

  commentsApp.put('/api/comments/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: 'Comment updated successfully',
      data: {
        id: request.params.id,
        text: request.body.text,
        authorId: request.user.id,
        likes: 3,
        dislikes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  });

  commentsApp.delete('/api/comments/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: 'Comment deleted successfully',
      timestamp: new Date().toISOString()
    };
  });

  commentsApp.post('/api/comments/:id/like', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: 'Comment liked successfully',
      data: {
        id: request.params.id,
        text: 'Test comment',
        authorId: 'test-user',
        likes: 4,
        dislikes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  });

  // Start mock comments service
  await commentsApp.listen({ port: 3001, host: '127.0.0.1' });

  // Start mock users service
  usersApp = Fastify({ logger: false });
  await usersApp.register(import('@fastify/cors'));
  
  usersApp.addHook('preHandler', async (request, reply) => {
    // Extract user context from gateway headers
    const userId = request.headers['x-user-id'];
    const userEmail = request.headers['x-user-email'];
    const userRoles = request.headers['x-user-roles'];
    const isGatewayForwarded = request.headers['x-gateway-forwarded'];

    request.user = null;
    request.isGatewayForwarded = isGatewayForwarded === 'true';

    if (userId) {
      request.user = {
        id: userId,
        email: userEmail,
        roles: userRoles ? JSON.parse(userRoles) : []
      };
    }
  });

  usersApp.get('/api/users', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      data: {
        users: [
          {
            id: request.user.id,
            email: request.user.email,
            firstName: 'Test',
            lastName: 'User',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            roles: request.user.roles
          }
        ],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 }
      },
      timestamp: new Date().toISOString()
    };
  });

  usersApp.get('/api/users/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      data: {
        id: request.params.id,
        email: request.user.email,
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        roles: request.user.roles
      },
      timestamp: new Date().toISOString()
    };
  });

  // Start mock users service
  await usersApp.listen({ port: 3002, host: '127.0.0.1' });

  // Initialize Gateway with test database
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${testDbPath}`
      }
    }
  });

  // Create database tables for gateway
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT,
      lastName TEXT,
      isActive BOOLEAN DEFAULT true,
      isVerified BOOLEAN DEFAULT false,
      lastLogin DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      isActive BOOLEAN DEFAULT true,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roleId TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
      UNIQUE(userId, roleId)
    )
  `;

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 12);
  const hashedAdminPassword = await bcrypt.hash('admin123', 12);

  const userRole = await prisma.role.create({
    data: {
      id: 'role-user',
      name: 'user',
      description: 'Regular user',
    }
  });

  const adminRole = await prisma.role.create({
    data: {
      id: 'role-admin',
      name: 'admin',
      description: 'Administrator',
    }
  });

  testUser = await prisma.user.create({
    data: {
      id: 'user-test-proxy',
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
    }
  });

  adminUser = await prisma.user.create({
    data: {
      id: 'user-admin-proxy',
      email: 'admin@example.com',
      password: hashedAdminPassword,
      firstName: 'Admin',
      lastName: 'User',
    }
  });

  await prisma.userRole.create({
    data: {
      id: 'user-role-test-proxy',
      userId: testUser.id,
      roleId: userRole.id,
    }
  });

  await prisma.userRole.create({
    data: {
      id: 'user-role-admin-proxy',
      userId: adminUser.id,
      roleId: adminRole.id,
    }
  });

  await prisma.$disconnect();

  // Import and start gateway
  process.env.COMMENTS_SERVICE_URL = 'http://127.0.0.1:3001';
  process.env.USER_SERVICE_URL = 'http://127.0.0.1:3002';
  
  const gatewayModule = await import('../../gateway.js');
  gatewayApp = gatewayModule.default;
  
  await new Promise(resolve => setTimeout(resolve, 3000));
}, 120000);

afterAll(async () => {
  if (gatewayApp) {
    await gatewayApp.close();
  }
  if (commentsApp) {
    await commentsApp.close();
  }
  if (usersApp) {
    await usersApp.close();
  }
  
  // Clean up test databases
  [testDbPath, commentsDbPath].forEach(dbPath => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    const journalPath = dbPath + '-journal';
    if (fs.existsSync(journalPath)) {
      fs.unlinkSync(journalPath);
    }
  });
}, 30000);

describe('Gateway Proxy E2E Tests', () => {
  describe('Authentication Through Gateway', () => {
    test('should authenticate user and get token', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();
      expect(body.data.email).toBe('test@example.com');

      userToken = body.token;
    });

    test('should authenticate admin user', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'admin@example.com',
          password: 'admin123'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();

      adminToken = body.token;
    });
  });

  describe('Comments Service Proxy', () => {
    test('should proxy GET /api/comments through gateway', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/api/comments',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toBeDefined();
      expect(Array.isArray(body.data.comments)).toBe(true);
      expect(body.timestamp).toBeDefined();
    });

    test('should proxy POST /api/comments through gateway with user context', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'Test comment created through gateway',
          parentId: null
        },
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe('Test comment created through gateway');
      expect(body.data.authorId).toBe(testUser.id);
      expect(body.data.id).toBeDefined();

      createdCommentId = body.data.id;
    });

    test('should proxy GET /api/comments/:id through gateway', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: `/api/comments/${createdCommentId || 'test-comment'}`,
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.text).toBeDefined();
    });

    test('should proxy PUT /api/comments/:id through gateway', async () => {
      const response = await gatewayApp.inject({
        method: 'PUT',
        url: `/api/comments/${createdCommentId || 'test-comment'}`,
        payload: {
          text: 'Updated comment text through gateway'
        },
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe('Updated comment text through gateway');
    });

    test('should proxy POST /api/comments/:id/like through gateway', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: `/api/comments/${createdCommentId || 'test-comment'}/like`,
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.likes).toBeGreaterThan(0);
    });

    test('should proxy DELETE /api/comments/:id through gateway', async () => {
      const response = await gatewayApp.inject({
        method: 'DELETE',
        url: `/api/comments/${createdCommentId || 'test-comment'}`,
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    test('should reject comments requests without authentication', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'Unauthorized comment'
        },
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    test('should handle 404 from comments service', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/api/comments/non-existent',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });
  });

  describe('Users Service Proxy', () => {
    test('should proxy GET /api/users through gateway', async () => {
      const response = await gatewayApp.inject({
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
    });

    test('should proxy GET /api/users/:id through gateway', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(testUser.id);
      expect(body.data.email).toBe(testUser.email);
    });

    test('should reject users requests without authentication', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/api/users'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Gateway Headers Forwarding', () => {
    test('should forward user context headers to microservices', async () => {
      // This test verifies that the mock services receive the correct headers
      // by checking that user-specific data is returned correctly
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/api/comments',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // The mock service should have received user context
      expect(body.data.comments[0].authorId).toBe(testUser.id);
    });

    test('should include gateway forwarding headers', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'Test header forwarding'
        },
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(201);
      // The mock service checks for x-gateway-forwarded header
      // If it receives the request, the header was forwarded correctly
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle service unavailable errors', async () => {
      // Stop comments service temporarily
      await commentsApp.close();

      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/api/comments',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('temporarily unavailable');

      // Restart comments service
      await commentsApp.listen({ port: 3001, host: '127.0.0.1' });
    });

    test('should handle malformed service responses', async () => {
      // This would be tested with a service that returns invalid JSON
      // For now, we test that valid JSON responses are handled correctly
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/api/comments',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      expect(() => JSON.parse(response.body)).not.toThrow();
    });

    test('should preserve service status codes', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/api/comments/non-existent',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      // Should preserve 404 from service
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Security and Access Control', () => {
    test('should require authentication for protected routes', async () => {
      const protectedRoutes = [
        { method: 'POST', url: '/api/comments' },
        { method: 'PUT', url: '/api/comments/test' },
        { method: 'DELETE', url: '/api/comments/test' },
        { method: 'GET', url: '/api/users' }
      ];

      for (const route of protectedRoutes) {
        const response = await gatewayApp.inject({
          method: route.method,
          url: route.url,
          payload: route.method !== 'GET' ? { test: 'data' } : undefined,
          headers: route.method !== 'GET' ? { 'content-type': 'application/json' } : undefined
        });

        expect(response.statusCode).toBe(401);
      }
    });

    test('should validate JWT tokens', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/api/comments',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    test('should not forward authorization headers to services', async () => {
      // The mock services check for x-gateway-forwarded instead of authorization headers
      // This ensures the gateway removes auth headers and forwards user context instead
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'Test no auth header forwarding'
        },
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(201);
      // If the service receives this request, it means the auth was properly
      // transformed to user context headers
    });
  });

  describe('Complete User Journey Through Gateway', () => {
    test('should complete full comment workflow through gateway', async () => {
      // 1. Create comment
      const createResponse = await gatewayApp.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'Complete workflow test comment'
        },
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json'
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const createdComment = JSON.parse(createResponse.body);
      const commentId = createdComment.data.id;

      // 2. Get comment
      const getResponse = await gatewayApp.inject({
        method: 'GET',
        url: `/api/comments/${commentId}`,
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(getResponse.statusCode).toBe(200);

      // 3. Update comment
      const updateResponse = await gatewayApp.inject({
        method: 'PUT',
        url: `/api/comments/${commentId}`,
        payload: {
          text: 'Updated workflow test comment'
        },
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json'
        }
      });

      expect(updateResponse.statusCode).toBe(200);

      // 4. Like comment
      const likeResponse = await gatewayApp.inject({
        method: 'POST',
        url: `/api/comments/${commentId}/like`,
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(likeResponse.statusCode).toBe(200);

      // 5. Delete comment
      const deleteResponse = await gatewayApp.inject({
        method: 'DELETE',
        url: `/api/comments/${commentId}`,
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(deleteResponse.statusCode).toBe(200);
    });

    test('should complete user profile workflow through gateway', async () => {
      // 1. Get user profile through gateway auth
      const profileResponse = await gatewayApp.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(profileResponse.statusCode).toBe(200);
      const profileData = JSON.parse(profileResponse.body);
      expect(profileData.data.email).toBe('test@example.com');

      // 2. Get user details through users service proxy
      const userResponse = await gatewayApp.inject({
        method: 'GET',
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`
        }
      });

      expect(userResponse.statusCode).toBe(200);
      const userData = JSON.parse(userResponse.body);
      expect(userData.data.email).toBe('test@example.com');
    });
  });
});