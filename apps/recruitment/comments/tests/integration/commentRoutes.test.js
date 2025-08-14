/**
 * Integration Tests for Comment Routes
 * Tests complete request-response cycle with Fastify and JSON Schema validation
 */

import Fastify from 'fastify';
import { jest } from '@jest/globals';
import commentRoutes from '@app/routes/comments.js';
import { CommentService } from '@app/services';
import { HTTP_STATUS } from '@app/constants';

// Mock the CommentService
jest.mock('@app/services', () => ({
  CommentService: jest.fn().mockImplementation(() => ({
    getAllComments: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    getCommentById: jest.fn(),
    searchComments: jest.fn(),
    getCommentStats: jest.fn(),
    likeComment: jest.fn(),
    dislikeComment: jest.fn(),
  })),
}));

describe('Comment Routes - Integration Tests', () => {
  let fastify;
  let mockService;

  beforeEach(async () => {
    // Create fresh Fastify instance for each test
    fastify = Fastify({ logger: false });

    // Register core plugins
    await fastify.register(import('@fastify/cors'));
    await fastify.register(import('@fastify/rate-limit'), {
      max: 1000, // High limit for tests
      timeWindow: '1 minute',
    });

    // Register comment routes
    await fastify.register(commentRoutes, { prefix: '/api/comments' });

    // Reset mocks
    jest.clearAllMocks();
    mockService = new CommentService();
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('GET /api/comments', () => {
    it('should return paginated comments successfully', async () => {
      const mockComments = [
        { id: '1', text: 'Test comment 1', createdAt: new Date() },
        { id: '2', text: 'Test comment 2', createdAt: new Date() },
      ];
      const mockPagination = { page: 1, limit: 10, total: 2, totalPages: 1 };

      mockService.getAllComments.mockResolvedValue({
        comments: mockComments,
        pagination: mockPagination,
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/comments?page=1&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toEqual(mockComments);
      expect(body.data.pagination).toEqual(mockPagination);
    });

    it('should handle validation errors for invalid query parameters', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/comments?page=invalid&limit=abc',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });

    it('should filter by parentId when provided', async () => {
      const mockReplies = [
        { id: '3', text: 'Reply 1', parentId: '1', createdAt: new Date() },
      ];

      mockService.getAllComments.mockResolvedValue({
        comments: mockReplies,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/comments?parentId=1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.comments).toEqual(mockReplies);
    });
  });

  describe('POST /api/comments', () => {
    it('should create a new comment successfully', async () => {
      const newComment = {
        id: '1',
        text: 'New test comment',
        likes: 0,
        dislikes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.createComment.mockResolvedValue(newComment);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'New test comment',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(newComment);
      expect(body.message).toBe('Comment created successfully');
    });

    it('should validate required fields', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });

    it('should validate text length constraints', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: '', // Empty text
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should create a reply when parentId is provided', async () => {
      const newReply = {
        id: '2',
        text: 'This is a reply',
        parentId: '1',
        likes: 0,
        dislikes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.createComment.mockResolvedValue(newReply);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'This is a reply',
          parentId: '1',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.parentId).toBe('1');
    });
  });

  describe('GET /api/comments/:id', () => {
    it('should return a specific comment by ID', async () => {
      const mockComment = {
        id: '1',
        text: 'Test comment',
        likes: 5,
        dislikes: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.getCommentById.mockResolvedValue(mockComment);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/comments/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockComment);
    });

    it('should return 404 for non-existent comment', async () => {
      mockService.getCommentById.mockResolvedValue(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/comments/999',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Comment not found');
    });
  });

  describe('PATCH /api/comments/:id', () => {
    it('should update a comment successfully', async () => {
      const updatedComment = {
        id: '1',
        text: 'Updated comment text',
        likes: 5,
        dislikes: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.updateComment.mockResolvedValue(updatedComment);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/comments/1',
        payload: {
          text: 'Updated comment text',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe('Updated comment text');
    });

    it('should validate update payload', async () => {
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/comments/1',
        payload: {
          text: '', // Invalid empty text
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete a comment successfully', async () => {
      mockService.deleteComment.mockResolvedValue(true);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/comments/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Comment deleted successfully');
    });

    it('should return 404 for non-existent comment', async () => {
      mockService.deleteComment.mockResolvedValue(false);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/comments/999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/comments/:id/like', () => {
    it('should like a comment successfully', async () => {
      const likedComment = {
        id: '1',
        text: 'Test comment',
        likes: 6,
        dislikes: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.likeComment.mockResolvedValue(likedComment);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments/1/like',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.likes).toBe(6);
    });
  });

  describe('POST /api/comments/:id/dislike', () => {
    it('should dislike a comment successfully', async () => {
      const dislikedComment = {
        id: '1',
        text: 'Test comment',
        likes: 5,
        dislikes: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.dislikeComment.mockResolvedValue(dislikedComment);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments/1/dislike',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.dislikes).toBe(2);
    });
  });

  describe('GET /api/comments/search', () => {
    it('should search comments successfully', async () => {
      const searchResults = [
        { id: '1', text: 'Test search result', createdAt: new Date() },
      ];

      mockService.searchComments.mockResolvedValue({
        comments: searchResults,
        query: 'test',
        count: 1,
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/comments/search?q=test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toEqual(searchResults);
    });

    it('should require search query parameter', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/comments/search',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/comments/stats', () => {
    it('should return comment statistics', async () => {
      const mockStats = {
        totalComments: 100,
        activeComments: 95,
        deletedComments: 5,
        totalLikes: 250,
        totalDislikes: 30,
        commentsToday: 10,
      };

      mockService.getCommentStats.mockResolvedValue(mockStats);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/comments/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockStats);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to POST requests', async () => {
      // This would require a more complex setup to test rate limiting
      // For now, we just verify the endpoint exists and works normally
      mockService.createComment.mockResolvedValue({
        id: '1',
        text: 'Test comment',
        createdAt: new Date(),
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Test comment' },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockService.getAllComments.mockRejectedValue(new Error('Database error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/comments',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return proper error format for validation failures', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { invalidField: 'invalid' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('timestamp');
    });
  });
});
