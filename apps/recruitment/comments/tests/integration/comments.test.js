/**
 * Comments Integration Tests
 * Tests the complete comments API functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fastify from '../../server.js';

describe('Comments Integration Tests', () => {
  let app;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = fastify;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Core Routes', () => {
    test('GET /health should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true,
        message: 'Comments API Server is running',
        service: 'comments',
        version: '2.0.0'
      });
      expect(body.timestamp).toBeDefined();
    });

    test('GET / should return API info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        message: 'Comments API Server',
        version: '2.0.0',
        framework: 'Fastify'
      });
      expect(body.endpoints).toBeDefined();
    });
  });

  describe('Comments API Endpoints', () => {
    // Mock user context for testing
    const mockUserHeaders = {
      'x-user-id': 'test-user-123',
      'x-user-email': 'test@example.com',
      'x-user-roles': JSON.stringify(['user']),
      'x-gateway-forwarded': 'true'
    };

    let createdCommentId = null;

    test('GET /api/comments should return empty list initially', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toBeDefined();
      expect(Array.isArray(body.data.comments)).toBe(true);
      expect(body.data.pagination).toBeDefined();
    });

    test('POST /api/comments should create a new comment with authentication', async () => {
      const commentData = {
        text: 'This is a test comment for integration testing!'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: mockUserHeaders,
        payload: commentData
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe(commentData.text);
      expect(body.data.id).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
      
      createdCommentId = body.data.id;
    });

    test('POST /api/comments should fail without authentication', async () => {
      const commentData = {
        text: 'This comment should fail'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: commentData
      });

      expect(response.statusCode).toBe(401);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Authentication required');
    });

    test('POST /api/comments should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: mockUserHeaders,
        payload: {} // Missing text field
      });

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Validation failed');
    });

    test('GET /api/comments/:id should return specific comment', async () => {
      expect(createdCommentId).toBeDefined();

      const response = await app.inject({
        method: 'GET',
        url: `/api/comments/${createdCommentId}`
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(createdCommentId);
      expect(body.data.text).toBeDefined();
    });

    test('GET /api/comments/:id should return 404 for non-existent comment', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    test('PUT /api/comments/:id should update comment with authentication', async () => {
      expect(createdCommentId).toBeDefined();

      const updateData = {
        text: 'This is an updated test comment!'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdCommentId}`,
        headers: mockUserHeaders,
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe(updateData.text);
      expect(body.data.updatedAt).toBeDefined();
    });

    test('PUT /api/comments/:id should fail without authentication', async () => {
      expect(createdCommentId).toBeDefined();

      const response = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdCommentId}`,
        payload: { text: 'Should fail' }
      });

      expect(response.statusCode).toBe(401);
    });

    test('POST /api/comments/:id/like should like a comment', async () => {
      expect(createdCommentId).toBeDefined();

      const response = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdCommentId}/like`,
        headers: mockUserHeaders
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.likes).toBeGreaterThan(0);
    });

    test('POST /api/comments/:id/dislike should dislike a comment', async () => {
      expect(createdCommentId).toBeDefined();

      const response = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdCommentId}/dislike`,
        headers: mockUserHeaders
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.dislikes).toBeGreaterThan(0);
    });

    test('GET /api/comments/search should search comments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/search?q=updated'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toBeDefined();
      expect(body.data.query).toBe('updated');
      expect(body.data.count).toBeDefined();
    });

    test('GET /api/comments/stats should return statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/stats'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.totalComments).toBeDefined();
      expect(body.data.activeComments).toBeDefined();
      expect(body.data.deletedComments).toBeDefined();
      expect(typeof body.data.totalComments).toBe('number');
    });

    test('DELETE /api/comments/:id should soft delete comment', async () => {
      expect(createdCommentId).toBeDefined();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${createdCommentId}`,
        headers: mockUserHeaders
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('deleted');
    });

    test('GET /api/comments/:id should not return deleted comment by default', async () => {
      expect(createdCommentId).toBeDefined();

      const response = await app.inject({
        method: 'GET',
        url: `/api/comments/${createdCommentId}`
      });

      // Should either return 404 or mark it as deleted
      expect([404, 200]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.data.deletedAt).toBeDefined();
      }
    });
  });

  describe('Pagination and Filtering', () => {
    const mockUserHeaders = {
      'x-user-id': 'test-user-pagination',
      'x-user-email': 'pagination@example.com',
      'x-user-roles': JSON.stringify(['user']),
      'x-gateway-forwarded': 'true'
    };

    beforeEach(async () => {
      // Create some test comments for pagination testing
      const comments = [
        'First comment for pagination',
        'Second comment for pagination',
        'Third comment for pagination',
        'Fourth comment for pagination',
        'Fifth comment for pagination'
      ];

      for (const text of comments) {
        await app.inject({
          method: 'POST',
          url: '/api/comments',
          headers: mockUserHeaders,
          payload: { text }
        });
      }
    });

    test('GET /api/comments should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments?page=1&limit=3'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments.length).toBeLessThanOrEqual(3);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(3);
      expect(body.data.pagination.total).toBeGreaterThan(0);
    });

    test('GET /api/comments should support parent comment filtering', async () => {
      // First create a parent comment
      const parentResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: mockUserHeaders,
        payload: { text: 'Parent comment' }
      });

      const parentId = JSON.parse(parentResponse.body).data.id;

      // Create a reply
      await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: mockUserHeaders,
        payload: { 
          text: 'Reply comment',
          parentId: parentId
        }
      });

      // Filter by parent ID
      const response = await app.inject({
        method: 'GET',
        url: `/api/comments?parentId=${parentId}`
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toBeDefined();
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require gateway forwarding', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: {
          'x-user-id': 'test-user',
          'x-user-email': 'test@example.com',
          'x-user-roles': JSON.stringify(['user'])
          // Missing x-gateway-forwarded header
        },
        payload: { text: 'Should fail' }
      });

      expect(response.statusCode).toBe(403);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('gateway required');
    });

    test('should handle private comments endpoint', async () => {
      const mockUserHeaders = {
        'x-user-id': 'private-user',
        'x-user-email': 'private@example.com',
        'x-user-roles': JSON.stringify(['user']),
        'x-gateway-forwarded': 'true'
      };

      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/my',
        headers: mockUserHeaders
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toBeDefined();
    });

    test('should fail private comments without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/my'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Default Comments Creation', () => {
    test('POST /api/comments/defaults should create default comments', async () => {
      const mockUserHeaders = {
        'x-user-id': 'defaults-user',
        'x-user-email': 'defaults@example.com',
        'x-user-roles': JSON.stringify(['user']),
        'x-gateway-forwarded': 'true'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/comments/defaults',
        headers: mockUserHeaders
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toBeDefined();
      expect(body.data.count).toBeDefined();
      expect(typeof body.data.count).toBe('number');
    });

    test('POST /api/comments/defaults should fail without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments/defaults'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-email': 'test@example.com',
          'x-user-roles': JSON.stringify(['user']),
          'x-gateway-forwarded': 'true'
        },
        payload: 'invalid-json'
      });

      expect([400, 415]).toContain(response.statusCode);
    });

    test('should handle rate limiting', async () => {
      const mockUserHeaders = {
        'x-user-id': 'rate-limit-user',
        'x-user-email': 'ratelimit@example.com',
        'x-user-roles': JSON.stringify(['user']),
        'x-gateway-forwarded': 'true'
      };

      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(10).fill(null).map(() => 
        app.inject({
          method: 'POST',
          url: '/api/comments',
          headers: mockUserHeaders,
          payload: { text: 'Rate limit test comment' }
        })
      );

      const responses = await Promise.all(requests);
      
      // At least some should succeed, but if rate limiting is working,
      // we might see some 429 responses
      const statusCodes = responses.map(r => r.statusCode);
      expect(statusCodes).toContain(201); // At least one should succeed
      
      // Check if rate limiting headers are present
      expect(responses[0].headers['x-ratelimit-limit']).toBeDefined();
    });
  });
});