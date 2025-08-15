/**
 * API Gateway Integration Tests
 * Tests routing to Comments and User Management services
 */

import { test, beforeAll, afterAll, describe, expect } from '@jest/globals';
import Fastify from 'fastify';

let gatewayApp;
let mockCommentsService;
let mockUserService;

beforeAll(async () => {
  // Create mock services
  mockCommentsService = Fastify({ logger: false });
  mockUserService = Fastify({ logger: false });

  // Mock Comments Service
  await mockCommentsService.register(async function (fastify) {
    fastify.get('/api/comments', async (request, reply) => {
      return {
        success: true,
        message: 'Comments retrieved from service',
        data: {
          comments: [
            { id: '1', text: 'Test comment 1', likes: 5 },
            { id: '2', text: 'Test comment 2', likes: 3 }
          ],
          pagination: { page: 1, limit: 20, total: 2 }
        },
        timestamp: new Date().toISOString()
      };
    });

    fastify.post('/api/comments', async (request, reply) => {
      reply.code(201);
      return {
        success: true,
        message: 'Comment created by service',
        data: {
          id: 'new-comment-id',
          text: request.body.text,
          likes: 0,
          dislikes: 0,
          createdAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    });

    fastify.get('/api/comments/:id', async (request, reply) => {
      const { id } = request.params;
      if (id === 'not-found') {
        reply.code(404);
        return { success: false, error: 'Comment not found' };
      }
      return {
        success: true,
        message: 'Comment retrieved from service',
        data: { id, text: 'Service comment text', likes: 10 },
        timestamp: new Date().toISOString()
      };
    });

    fastify.put('/api/comments/:id', async (request, reply) => {
      return {
        success: true,
        message: 'Comment updated by service',
        data: {
          id: request.params.id,
          text: request.body.text,
          updatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    });

    fastify.delete('/api/comments/:id', async (request, reply) => {
      reply.code(204);
      return;
    });

    fastify.post('/api/comments/:id/like', async (request, reply) => {
      return {
        success: true,
        message: 'Comment liked by service',
        data: {
          id: request.params.id,
          likes: 11
        },
        timestamp: new Date().toISOString()
      };
    });

    // Health check for service
    fastify.get('/api/health', async () => ({
      status: 'OK',
      service: 'Comments Service',
      timestamp: new Date().toISOString()
    }));
  });

  // Mock User Management Service
  await mockUserService.register(async function (fastify) {
    fastify.get('/api/users', async (request, reply) => {
      return {
        success: true,
        message: 'Users retrieved from service',
        data: {
          users: [
            {
              id: '1',
              email: 'user1@test.com',
              username: 'user1',
              firstName: 'Test',
              lastName: 'User1',
              isActive: true
            },
            {
              id: '2',
              email: 'user2@test.com',
              username: 'user2',
              firstName: 'Test',
              lastName: 'User2',
              isActive: true
            }
          ],
          pagination: { page: 1, limit: 20, total: 2 }
        },
        timestamp: new Date().toISOString()
      };
    });

    fastify.post('/api/users', async (request, reply) => {
      reply.code(201);
      return {
        success: true,
        message: 'User created by service',
        data: {
          id: 'new-user-id',
          email: request.body.email,
          username: request.body.username,
          firstName: request.body.firstName,
          lastName: request.body.lastName,
          isActive: true,
          isVerified: false,
          createdAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    });

    fastify.get('/api/users/:id', async (request, reply) => {
      const { id } = request.params;
      if (id === 'not-found') {
        reply.code(404);
        return { success: false, error: 'User not found' };
      }
      return {
        success: true,
        message: 'User retrieved from service',
        data: {
          id,
          email: 'service@test.com',
          username: 'serviceuser',
          firstName: 'Service',
          lastName: 'User',
          isActive: true
        },
        timestamp: new Date().toISOString()
      };
    });

    fastify.put('/api/users/:id', async (request, reply) => {
      return {
        success: true,
        message: 'User updated by service',
        data: {
          id: request.params.id,
          ...request.body,
          updatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    });

    fastify.delete('/api/users/:id', async (request, reply) => {
      reply.code(204);
      return;
    });

    fastify.post('/api/users/:id/activate', async (request, reply) => {
      return {
        success: true,
        message: 'User activated by service',
        data: {
          id: request.params.id,
          isActive: true
        },
        timestamp: new Date().toISOString()
      };
    });

    // Health check for service
    fastify.get('/api/health', async () => ({
      status: 'OK',
      service: 'User Management Service',
      timestamp: new Date().toISOString()
    }));
  });

  // Start mock services
  await mockCommentsService.listen({ port: 3001, host: '127.0.0.1' });
  await mockUserService.listen({ port: 3002, host: '127.0.0.1' });

  // Create Gateway App
  gatewayApp = Fastify({ logger: false });

  // Register gateway plugins
  await gatewayApp.register(import('@fastify/cors'));
  await gatewayApp.register(import('@fastify/sensible'));

  // Register HTTP Proxy for Comments Service
  await gatewayApp.register(async function (fastify) {
    await fastify.register(import('@fastify/http-proxy'), {
      upstream: 'http://127.0.0.1:3101',
      prefix: '/part/recruitment/comments',
      rewritePrefix: '/api',
      preHandler: async (request, reply) => {
        // Add gateway headers
        request.headers['x-request-id'] = request.id || 'test-request-id';
        request.headers['x-gateway-version'] = '2.0.0';
        request.headers['x-service-name'] = 'recruitment-comments';
      }
    });
  });

  // Register HTTP Proxy for User Management Service  
  await gatewayApp.register(async function (fastify) {
    await fastify.register(import('@fastify/http-proxy'), {
      upstream: 'http://127.0.0.1:3103',
      prefix: '/part/recruitment/users',
      rewritePrefix: '/api',
      preHandler: async (request, reply) => {
        // Add gateway headers
        request.headers['x-request-id'] = request.id || 'test-request-id';
        request.headers['x-gateway-version'] = '2.0.0';
        request.headers['x-service-name'] = 'recruitment-users';
      }
    });
  });

  // Add root endpoint
  gatewayApp.get('/', async () => ({
    message: 'API Gateway Test Instance',
    version: '2.0.0',
    services: ['recruitment/comments', 'recruitment/users'],
    timestamp: new Date().toISOString()
  }));

  // Add health endpoint
  gatewayApp.get('/health', async () => ({
    status: 'OK',
    service: 'API Gateway',
    timestamp: new Date().toISOString()
  }));

  await gatewayApp.ready();
});

afterAll(async () => {
  if (gatewayApp) {
    await gatewayApp.close();
  }
  if (mockCommentsService) {
    await mockCommentsService.close();
  }
  if (mockUserService) {
    await mockUserService.close();
  }
});

describe('API Gateway Integration Tests', () => {
  describe('Gateway Health and Info', () => {
    test('should return gateway information at root endpoint', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('API Gateway');
      expect(body.version).toBe('2.0.0');
      expect(body.services).toContain('recruitment/comments');
      expect(body.services).toContain('recruitment/users');
    });

    test('should return gateway health status', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('OK');
      expect(body.service).toBe('API Gateway');
    });
  });

  describe('Comments Service Routing', () => {
    test('should route GET /part/part/recruitment/comments to comments service', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/part/recruitment/comments'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Comments retrieved from service');
      expect(body.data.comments).toHaveLength(2);
      expect(body.data.comments[0].text).toBe('Test comment 1');
    });

    test('should route POST /part/recruitment/comments to comments service', async () => {
      const commentData = {
        text: 'Gateway routed comment'
      };

      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/part/recruitment/comments',
        payload: commentData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Comment created by service');
      expect(body.data.text).toBe(commentData.text);
      expect(body.data.id).toBe('new-comment-id');
    });

    test('should route GET /part/recruitment/comments/:id to comments service', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/recruitment/comments/test-id'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Comment retrieved from service');
      expect(body.data.id).toBe('test-id');
    });

    test('should route PUT /part/recruitment/comments/:id to comments service', async () => {
      const updateData = {
        text: 'Updated via gateway'
      };

      const response = await gatewayApp.inject({
        method: 'PUT',
        url: '/part/recruitment/comments/test-id',
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Comment updated by service');
      expect(body.data.text).toBe(updateData.text);
    });

    test('should route DELETE /part/recruitment/comments/:id to comments service', async () => {
      const response = await gatewayApp.inject({
        method: 'DELETE',
        url: '/part/recruitment/comments/test-id'
      });

      expect(response.statusCode).toBe(204);
    });

    test('should route POST /part/recruitment/comments/:id/like to comments service', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/part/recruitment/comments/test-id/like'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Comment liked by service');
      expect(body.data.likes).toBe(11);
    });

    test('should handle 404 responses from comments service', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/recruitment/comments/not-found'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Comment not found');
    });

    test('should route comments with query parameters', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/recruitment/comments?page=1&limit=10&search=test'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('User Management Service Routing', () => {
    test('should route GET /part/recruitment/users to user service', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/recruitment/users'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Users retrieved from service');
      expect(body.data.users).toHaveLength(2);
      expect(body.data.users[0].email).toBe('user1@test.com');
    });

    test('should route POST /part/recruitment/users to user service', async () => {
      const userData = {
        email: 'gateway@test.com',
        username: 'gatewayuser',
        password: 'password123',
        firstName: 'Gateway',
        lastName: 'User'
      };

      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/part/recruitment/users',
        payload: userData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('User created by service');
      expect(body.data.email).toBe(userData.email);
      expect(body.data.username).toBe(userData.username);
      expect(body.data.id).toBe('new-user-id');
    });

    test('should route GET /part/recruitment/users/:id to user service', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/recruitment/users/test-user-id'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('User retrieved from service');
      expect(body.data.id).toBe('test-user-id');
    });

    test('should route PUT /part/recruitment/users/:id to user service', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'ViaGateway'
      };

      const response = await gatewayApp.inject({
        method: 'PUT',
        url: '/part/recruitment/users/test-user-id',
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('User updated by service');
      expect(body.data.firstName).toBe(updateData.firstName);
      expect(body.data.lastName).toBe(updateData.lastName);
    });

    test('should route DELETE /part/recruitment/users/:id to user service', async () => {
      const response = await gatewayApp.inject({
        method: 'DELETE',
        url: '/part/recruitment/users/test-user-id'
      });

      expect(response.statusCode).toBe(204);
    });

    test('should route POST /part/recruitment/users/:id/activate to user service', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/part/recruitment/users/test-user-id/activate'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('User activated by service');
      expect(body.data.isActive).toBe(true);
    });

    test('should handle 404 responses from user service', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/recruitment/users/not-found'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('User not found');
    });

    test('should route users with query parameters', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/recruitment/users?page=1&limit=5&search=test&isActive=true'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Service Route Validation', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/non-existent-route'
      });

      expect(response.statusCode).toBe(404);
    });

    test('should return 404 for non-existent service paths', async () => {
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/recruitment/nonexistent'
      });

      expect(response.statusCode).toBe(404);
    });

    test('should handle malformed request bodies', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/part/recruitment/comments',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Gateway Headers and Metadata', () => {
    test('should add gateway headers to proxied requests', async () => {
      // This would need to be verified in the mock services
      // For now, we test that the request goes through successfully
      const response = await gatewayApp.inject({
        method: 'GET',
        url: '/part/recruitment/comments'
      });

      expect(response.statusCode).toBe(200);
      // In a real implementation, we would verify that the upstream service
      // received the x-request-id, x-gateway-version, and x-service-name headers
    });

    test('should handle CORS preflight requests', async () => {
      const response = await gatewayApp.inject({
        method: 'OPTIONS',
        url: '/part/recruitment/comments',
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

  describe('End-to-End Workflow Tests', () => {
    test('should complete full comment workflow through gateway', async () => {
      // 1. Create a comment
      const createResponse = await gatewayApp.inject({
        method: 'POST',
        url: '/part/recruitment/comments',
        payload: { text: 'E2E test comment' }
      });

      expect(createResponse.statusCode).toBe(201);
      const createdComment = JSON.parse(createResponse.body).data;

      // 2. Retrieve the comment
      const getResponse = await gatewayApp.inject({
        method: 'GET',
        url: `/part/recruitment/comments/${createdComment.id}`
      });

      expect(getResponse.statusCode).toBe(200);

      // 3. Like the comment
      const likeResponse = await gatewayApp.inject({
        method: 'POST',
        url: `/part/recruitment/comments/${createdComment.id}/like`
      });

      expect(likeResponse.statusCode).toBe(200);

      // 4. Update the comment
      const updateResponse = await gatewayApp.inject({
        method: 'PUT',
        url: `/part/recruitment/comments/${createdComment.id}`,
        payload: { text: 'Updated E2E comment' }
      });

      expect(updateResponse.statusCode).toBe(200);

      // 5. Delete the comment
      const deleteResponse = await gatewayApp.inject({
        method: 'DELETE',
        url: `/part/recruitment/comments/${createdComment.id}`
      });

      expect(deleteResponse.statusCode).toBe(204);
    });

    test('should complete full user workflow through gateway', async () => {
      // 1. Create a user
      const createResponse = await gatewayApp.inject({
        method: 'POST',
        url: '/part/recruitment/users',
        payload: {
          email: 'e2e@test.com',
          username: 'e2euser',
          password: 'password123',
          firstName: 'E2E',
          lastName: 'Test'
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const createdUser = JSON.parse(createResponse.body).data;

      // 2. Retrieve the user
      const getResponse = await gatewayApp.inject({
        method: 'GET',
        url: `/part/recruitment/users/${createdUser.id}`
      });

      expect(getResponse.statusCode).toBe(200);

      // 3. Update the user
      const updateResponse = await gatewayApp.inject({
        method: 'PUT',
        url: `/part/recruitment/users/${createdUser.id}`,
        payload: { firstName: 'Updated' }
      });

      expect(updateResponse.statusCode).toBe(200);

      // 4. Activate the user
      const activateResponse = await gatewayApp.inject({
        method: 'POST',
        url: `/part/recruitment/users/${createdUser.id}/activate`
      });

      expect(activateResponse.statusCode).toBe(200);

      // 5. Delete the user
      const deleteResponse = await gatewayApp.inject({
        method: 'DELETE',
        url: `/part/recruitment/users/${createdUser.id}`
      });

      expect(deleteResponse.statusCode).toBe(204);
    });
  });

  describe('Service Integration', () => {
    test('should handle concurrent requests to different services', async () => {
      const [commentsResponse, usersResponse] = await Promise.all([
        gatewayApp.inject({
          method: 'GET',
          url: '/part/recruitment/comments'
        }),
        gatewayApp.inject({
          method: 'GET',
          url: '/part/recruitment/users'
        })
      ]);

      expect(commentsResponse.statusCode).toBe(200);
      expect(usersResponse.statusCode).toBe(200);

      const commentsBody = JSON.parse(commentsResponse.body);
      const usersBody = JSON.parse(usersResponse.body);

      expect(commentsBody.message).toContain('Comments retrieved');
      expect(usersBody.message).toContain('Users retrieved');
    });

    test('should handle requests with different content types', async () => {
      const response = await gatewayApp.inject({
        method: 'POST',
        url: '/part/recruitment/comments',
        payload: { text: 'Content type test' },
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(201);
    });
  });
});