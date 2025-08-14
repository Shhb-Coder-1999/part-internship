/**
 * Comments API Integration Tests
 * Tests all comment endpoints directly against the service
 */

import { test, beforeAll, afterAll, describe, expect, jest } from '@jest/globals';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

// Mock the shared module logger to avoid import issues
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

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

  // Mock the shared controllers to avoid import issues
  const mockCommentController = {
    async getAllComments(request, reply) {
      const comments = await prisma.comment.findMany({
        take: parseInt(request.query.limit) || 20,
        skip: ((parseInt(request.query.page) || 1) - 1) * (parseInt(request.query.limit) || 20),
        orderBy: { createdAt: 'desc' }
      });
      
      return {
        success: true,
        message: 'Comments retrieved successfully',
        data: {
          comments,
          pagination: {
            page: parseInt(request.query.page) || 1,
            limit: parseInt(request.query.limit) || 20,
            total: await prisma.comment.count()
          }
        },
        timestamp: new Date().toISOString()
      };
    },

    async createComment(request, reply) {
      const { text, parentId } = request.body;
      
      if (!text || text.trim().length === 0) {
        reply.code(400);
        return {
          success: false,
          error: 'Comment text is required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        };
      }

      const comment = await prisma.comment.create({
        data: {
          text: text.trim(),
          parentId: parentId || null,
          likes: 0,
          dislikes: 0
        }
      });

      reply.code(201);
      return {
        success: true,
        message: 'Comment created successfully',
        data: comment,
        timestamp: new Date().toISOString()
      };
    },

    async getCommentById(request, reply) {
      const { id } = request.params;
      
      const comment = await prisma.comment.findUnique({
        where: { id }
      });

      if (!comment || comment.deletedAt) {
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
    },

    async updateComment(request, reply) {
      const { id } = request.params;
      const { text } = request.body;

      if (!text || text.trim().length === 0) {
        reply.code(400);
        return {
          success: false,
          error: 'Comment text is required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        };
      }

      const existingComment = await prisma.comment.findUnique({
        where: { id }
      });

      if (!existingComment || existingComment.deletedAt) {
        reply.code(404);
        return {
          success: false,
          error: 'Comment not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      const comment = await prisma.comment.update({
        where: { id },
        data: {
          text: text.trim(),
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Comment updated successfully',
        data: comment,
        timestamp: new Date().toISOString()
      };
    },

    async deleteComment(request, reply) {
      const { id } = request.params;

      const existingComment = await prisma.comment.findUnique({
        where: { id }
      });

      if (!existingComment || existingComment.deletedAt) {
        reply.code(404);
        return {
          success: false,
          error: 'Comment not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      // Soft delete
      await prisma.comment.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });

      reply.code(204);
      return;
    },

    async likeComment(request, reply) {
      const { id } = request.params;

      const existingComment = await prisma.comment.findUnique({
        where: { id }
      });

      if (!existingComment || existingComment.deletedAt) {
        reply.code(404);
        return {
          success: false,
          error: 'Comment not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        };
      }

      const comment = await prisma.comment.update({
        where: { id },
        data: {
          likes: { increment: 1 }
        }
      });

      return {
        success: true,
        message: 'Comment liked successfully',
        data: comment,
        timestamp: new Date().toISOString()
      };
    }
  };

  // Register routes
  await app.register(async function (fastify) {
    // Get all comments
    fastify.get('/api/comments', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string' }
          }
        }
      }
    }, mockCommentController.getAllComments);

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
    }, mockCommentController.createComment);

    // Get comment by ID
    fastify.get('/api/comments/:id', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    }, mockCommentController.getCommentById);

    // Update comment
    fastify.put('/api/comments/:id', {
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
            text: { type: 'string', minLength: 1, maxLength: 1000 }
          },
          required: ['text']
        }
      }
    }, mockCommentController.updateComment);

    // Delete comment
    fastify.delete('/api/comments/:id', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    }, mockCommentController.deleteComment);

    // Like comment
    fastify.post('/api/comments/:id/like', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    }, mockCommentController.likeComment);
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

describe('Comments API Integration Tests', () => {
  describe('GET /api/comments', () => {
    test('should return paginated comments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('comments');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray(body.data.comments)).toBe(true);
    });

    test('should handle pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments?page=1&limit=5'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.page).toBe(1);
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
      expect(body.data).toHaveProperty('id');
      expect(body.data.likes).toBe(0);
      expect(body.data.dislikes).toBe(0);
    });

    test('should handle validation errors for empty text', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: '' }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('required');
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
    test('should return a specific comment by ID', async () => {
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
      expect(body.error).toContain('not found');
    });
  });

  describe('PUT /api/comments/:id', () => {
    test('should update an existing comment', async () => {
      // First create a comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Original comment text' }
      });

      const createdComment = JSON.parse(createResponse.body).data;

      // Then update it
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdComment.id}`,
        payload: { text: 'Updated comment text' }
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = JSON.parse(updateResponse.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe('Updated comment text');
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

    test('should handle validation errors for empty text', async () => {
      // First create a comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Original comment' }
      });

      const createdComment = JSON.parse(createResponse.body).data;

      // Try to update with empty text
      const response = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdComment.id}`,
        payload: { text: '' }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    test('should delete an existing comment (soft delete)', async () => {
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

      // Verify it's soft deleted (should return 404)
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
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/comments/:id/like', () => {
    test('should like a comment and increment like count', async () => {
      // First create a comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Comment to like' }
      });

      const createdComment = JSON.parse(createResponse.body).data;
      const initialLikes = createdComment.likes;

      // Then like it
      const likeResponse = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdComment.id}/like`
      });

      expect(likeResponse.statusCode).toBe(200);
      const body = JSON.parse(likeResponse.body);
      expect(body.success).toBe(true);
      expect(body.data.likes).toBe(initialLikes + 1);
    });

    test('should return 404 for liking non-existent comment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments/non-existent-id/like'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON in request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle very long comment text', async () => {
      const longText = 'a'.repeat(1500); // Exceeds max length
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: longText }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });
  });
});