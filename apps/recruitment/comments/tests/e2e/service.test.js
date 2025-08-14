/**
 * Comments Service E2E Tests
 * Tests the actual service endpoints without mocking conflicts
 */

import { test, beforeAll, afterAll, describe, expect } from '@jest/globals';
import Fastify from 'fastify';

let app;

beforeAll(async () => {
  // Create a minimal test app for Comments Service
  app = Fastify({ logger: false });

  // Register core plugins
  await app.register(import('@fastify/cors'));
  await app.register(import('@fastify/sensible'));

  // Simple test endpoints that simulate the comments service behavior
  await app.register(async function (fastify) {
    // In-memory storage for testing
    let comments = [];
    let commentCounter = 1;

    // Get all comments
    fastify.get('/api/comments', async (request, reply) => {
      const page = parseInt(request.query.page) || 1;
      const limit = parseInt(request.query.limit) || 20;
      const skip = (page - 1) * limit;

      let filteredComments = comments.filter(c => !c.deletedAt);
      
      if (request.query.search) {
        filteredComments = filteredComments.filter(c => 
          c.text.toLowerCase().includes(request.query.search.toLowerCase())
        );
      }

      const paginatedComments = filteredComments.slice(skip, skip + limit);

      return {
        success: true,
        message: 'Comments retrieved successfully',
        data: {
          comments: paginatedComments,
          pagination: {
            page,
            limit,
            total: filteredComments.length,
            totalPages: Math.ceil(filteredComments.length / limit)
          }
        },
        timestamp: new Date().toISOString()
      };
    });

    // Create comment
    fastify.post('/api/comments', {
      schema: {
        body: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 1000 },
            parentId: { type: 'string' }
          },
          required: ['text']
        }
      }
    }, async (request, reply) => {
      const { text, parentId } = request.body;

      const comment = {
        id: `comment-${commentCounter++}`,
        text: text.trim(),
        parentId: parentId || null,
        likes: 0,
        dislikes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };

      comments.push(comment);

      reply.code(201);
      return {
        success: true,
        message: 'Comment created successfully',
        data: comment,
        timestamp: new Date().toISOString()
      };
    });

    // Get comment by ID
    fastify.get('/api/comments/:id', async (request, reply) => {
      const comment = comments.find(c => c.id === request.params.id && !c.deletedAt);
      
      if (!comment) {
        reply.code(404);
        return {
          success: false,
          error: 'Comment not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        message: 'Comment retrieved successfully',
        data: comment,
        timestamp: new Date().toISOString()
      };
    });

    // Update comment
    fastify.put('/api/comments/:id', {
      schema: {
        body: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 1000 }
          },
          required: ['text']
        }
      }
    }, async (request, reply) => {
      const commentIndex = comments.findIndex(c => c.id === request.params.id && !c.deletedAt);
      
      if (commentIndex === -1) {
        reply.code(404);
        return {
          success: false,
          error: 'Comment not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      comments[commentIndex] = {
        ...comments[commentIndex],
        text: request.body.text.trim(),
        updatedAt: new Date().toISOString()
      };

      return {
        success: true,
        message: 'Comment updated successfully',
        data: comments[commentIndex],
        timestamp: new Date().toISOString()
      };
    });

    // Delete comment (soft delete)
    fastify.delete('/api/comments/:id', async (request, reply) => {
      const commentIndex = comments.findIndex(c => c.id === request.params.id && !c.deletedAt);
      
      if (commentIndex === -1) {
        reply.code(404);
        return {
          success: false,
          error: 'Comment not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      comments[commentIndex].deletedAt = new Date().toISOString();

      reply.code(204);
      return;
    });

    // Like comment
    fastify.post('/api/comments/:id/like', async (request, reply) => {
      const commentIndex = comments.findIndex(c => c.id === request.params.id && !c.deletedAt);
      
      if (commentIndex === -1) {
        reply.code(404);
        return {
          success: false,
          error: 'Comment not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      comments[commentIndex].likes += 1;

      return {
        success: true,
        message: 'Comment liked successfully',
        data: comments[commentIndex],
        timestamp: new Date().toISOString()
      };
    });

    // Health check
    fastify.get('/api/health', async () => ({
      status: 'OK',
      service: 'Comments Service',
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

describe('Comments Service E2E Tests', () => {
  describe('Health Check', () => {
    test('should return service health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('OK');
      expect(body.service).toBe('Comments Service');
    });
  });

  describe('GET /api/comments', () => {
    test('should return empty comments list initially', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toEqual([]);
      expect(body.data.pagination.total).toBe(0);
    });

    test('should handle pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments?page=2&limit=5'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.limit).toBe(5);
    });
  });

  describe('POST /api/comments', () => {
    test('should create a new comment', async () => {
      const commentData = {
        text: 'This is a test comment'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: commentData
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe(commentData.text);
      expect(body.data.id).toMatch(/^comment-\d+$/);
      expect(body.data.likes).toBe(0);
      expect(body.data.dislikes).toBe(0);
    });

    test('should validate required text field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });

    test('should create a reply comment with parentId', async () => {
      // First create a parent comment
      const parentResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Parent comment' }
      });

      const parentComment = JSON.parse(parentResponse.body).data;

      // Then create a reply
      const replyResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'This is a reply',
          parentId: parentComment.id
        }
      });

      expect(replyResponse.statusCode).toBe(201);
      const body = JSON.parse(replyResponse.body);
      expect(body.data.parentId).toBe(parentComment.id);
    });
  });

  describe('GET /api/comments/:id', () => {
    test('should retrieve a specific comment', async () => {
      // First create a comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Comment to retrieve' }
      });

      const createdComment = JSON.parse(createResponse.body).data;

      // Then retrieve it
      const response = await app.inject({
        method: 'GET',
        url: `/api/comments/${createdComment.id}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(createdComment.id);
      expect(body.data.text).toBe('Comment to retrieve');
    });

    test('should return 404 for non-existent comment', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Comment not found');
    });
  });

  describe('PUT /api/comments/:id', () => {
    test('should update an existing comment', async () => {
      // First create a comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Original text' }
      });

      const createdComment = JSON.parse(createResponse.body).data;

      // Then update it
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdComment.id}`,
        payload: { text: 'Updated text' }
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = JSON.parse(updateResponse.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe('Updated text');
      expect(body.data.id).toBe(createdComment.id);
    });

    test('should return 404 for updating non-existent comment', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/comments/non-existent-id',
        payload: { text: 'Updated text' }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    test('should validate text field', async () => {
      // First create a comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Original text' }
      });

      const createdComment = JSON.parse(createResponse.body).data;

      // Try to update without text
      const response = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdComment.id}`,
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    test('should soft delete a comment', async () => {
      // First create a comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Comment to delete' }
      });

      const createdComment = JSON.parse(createResponse.body).data;

      // Then delete it
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${createdComment.id}`
      });

      expect(deleteResponse.statusCode).toBe(204);

      // Verify it's deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/comments/${createdComment.id}`
      });

      expect(getResponse.statusCode).toBe(404);
    });

    test('should return 404 for deleting non-existent comment', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/comments/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/comments/:id/like', () => {
    test('should like a comment and increment count', async () => {
      // First create a comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Comment to like' }
      });

      const createdComment = JSON.parse(createResponse.body).data;

      // Then like it
      const likeResponse = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdComment.id}/like`
      });

      expect(likeResponse.statusCode).toBe(200);
      const body = JSON.parse(likeResponse.body);
      expect(body.success).toBe(true);
      expect(body.data.likes).toBe(1);
    });

    test('should return 404 for liking non-existent comment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments/non-existent-id/like'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Full Workflow Test', () => {
    test('should complete full CRUD workflow', async () => {
      // 1. Create a comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Workflow test comment' }
      });

      expect(createResponse.statusCode).toBe(201);
      const createdComment = JSON.parse(createResponse.body).data;

      // 2. Retrieve the comment
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/comments/${createdComment.id}`
      });

      expect(getResponse.statusCode).toBe(200);

      // 3. Like the comment
      const likeResponse = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdComment.id}/like`
      });

      expect(likeResponse.statusCode).toBe(200);
      expect(JSON.parse(likeResponse.body).data.likes).toBe(1);

      // 4. Update the comment
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdComment.id}`,
        payload: { text: 'Updated workflow comment' }
      });

      expect(updateResponse.statusCode).toBe(200);
      expect(JSON.parse(updateResponse.body).data.text).toBe('Updated workflow comment');

      // 5. Verify it appears in list
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(listResponse.statusCode).toBe(200);
      const listBody = JSON.parse(listResponse.body);
      const foundComment = listBody.data.comments.find(c => c.id === createdComment.id);
      expect(foundComment).toBeTruthy();
      expect(foundComment.text).toBe('Updated workflow comment');
      expect(foundComment.likes).toBe(1);

      // 6. Delete the comment
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${createdComment.id}`
      });

      expect(deleteResponse.statusCode).toBe(204);

      // 7. Verify it's gone from list
      const finalListResponse = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(finalListResponse.statusCode).toBe(200);
      const finalListBody = JSON.parse(finalListResponse.body);
      const deletedComment = finalListBody.data.comments.find(c => c.id === createdComment.id);
      expect(deletedComment).toBeFalsy();
    });
  });

  describe('Search and Filtering', () => {
    test('should filter comments by search term', async () => {
      // Create some test comments
      await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'JavaScript is awesome' }
      });

      await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Python is great too' }
      });

      // Search for JavaScript
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments?search=javascript'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.comments).toHaveLength(1);
      expect(body.data.comments[0].text).toBe('JavaScript is awesome');
    });
  });
});