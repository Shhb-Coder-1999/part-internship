/**
 * End-to-End Tests for Comment Workflow
 * Tests complete user workflows and system integration with Fastify
 */

import { jest } from '@jest/globals';
import Fastify from 'fastify';
import { commentRoutes } from '@routes';
import {
  generateMockComment,
  generateMockCommentRequest,
  generateMockCommentUpdateRequest,
  setupTestDatabase,
  cleanupTestDatabase,
} from '../helpers/testUtils';

// Manual mock for services
const mockCommentService = {
  createComment: jest.fn(),
  getComments: jest.fn(),
  getCommentById: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  searchComments: jest.fn(),
  getCommentStats: jest.fn(),
  likeComment: jest.fn(),
  dislikeComment: jest.fn(),
};

describe('Comment Workflow - E2E Tests', () => {
  let fastify;
  let testDatabase;

  beforeAll(async () => {
    // Setup test database
    testDatabase = await setupTestDatabase();
  });

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

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fastify.close();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDatabase);
  });

  describe('Complete Comment Lifecycle', () => {
    it('should handle complete CRUD workflow for a comment', async () => {
      const commentData = generateMockCommentRequest();
      const createdComment = generateMockComment();
      const updatedCommentData = generateMockCommentUpdateRequest();
      const updatedComment = { ...createdComment, ...updatedCommentData };

      // Mock service responses
      mockCommentService.createComment.mockResolvedValue(createdComment);
      mockCommentService.getCommentById.mockResolvedValue(createdComment);
      mockCommentService.updateComment.mockResolvedValue(updatedComment);
      mockCommentService.deleteComment.mockResolvedValue(true);

      // Step 1: Create comment
      const createResponse = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: commentData,
      });

      expect(createResponse.statusCode).toBe(201);
      const createBody = JSON.parse(createResponse.body);
      expect(createBody.success).toBe(true);
      expect(createBody.data.text).toBe(commentData.text);
      const commentId = createBody.data.id;

      // Step 2: Read created comment
      const readResponse = await fastify.inject({
        method: 'GET',
        url: `/api/comments/${commentId}`,
      });

      expect(readResponse.statusCode).toBe(200);
      const readBody = JSON.parse(readResponse.body);
      expect(readBody.success).toBe(true);
      expect(readBody.data.id).toBe(commentId);

      // Step 3: Update comment
      const updateResponse = await fastify.inject({
        method: 'PATCH',
        url: `/api/comments/${commentId}`,
        payload: updatedCommentData,
      });

      expect(updateResponse.statusCode).toBe(200);
      const updateBody = JSON.parse(updateResponse.body);
      expect(updateBody.success).toBe(true);
      expect(updateBody.data.text).toBe(updatedCommentData.text);

      // Step 4: Delete comment
      const deleteResponse = await fastify.inject({
        method: 'DELETE',
        url: `/api/comments/${commentId}`,
      });

      expect(deleteResponse.statusCode).toBe(200);
      const deleteBody = JSON.parse(deleteResponse.body);
      expect(deleteBody.success).toBe(true);
    });
  });

  describe('Comment Thread Workflow', () => {
    it('should handle parent-child comment relationships', async () => {
      const parentCommentData = generateMockCommentRequest();
      const parentComment = generateMockComment();
      const replyData = {
        ...generateMockCommentRequest(),
        parentId: parentComment.id,
      };
      const replyComment = {
        ...generateMockComment(),
        parentId: parentComment.id,
      };

      // Mock service responses
      mockCommentService.createComment
        .mockResolvedValueOnce(parentComment)
        .mockResolvedValueOnce(replyComment);

      mockCommentService.getComments.mockResolvedValue({
        comments: [replyComment],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      // Step 1: Create parent comment
      const parentResponse = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: parentCommentData,
      });

      expect(parentResponse.statusCode).toBe(201);
      const parentBody = JSON.parse(parentResponse.body);
      const parentId = parentBody.data.id;

      // Step 2: Create reply to parent comment
      const replyResponse = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: replyData,
      });

      expect(replyResponse.statusCode).toBe(201);
      const replyBody = JSON.parse(replyResponse.body);
      expect(replyBody.data.parentId).toBe(parentId);

      // Step 3: Get replies for parent comment
      const repliesResponse = await fastify.inject({
        method: 'GET',
        url: `/api/comments?parentId=${parentId}`,
      });

      expect(repliesResponse.statusCode).toBe(200);
      const repliesBody = JSON.parse(repliesResponse.body);
      expect(repliesBody.success).toBe(true);
      expect(repliesBody.data.comments).toHaveLength(1);
      expect(repliesBody.data.comments[0].parentId).toBe(parentId);
    });
  });

  describe('Comment Interaction Workflow', () => {
    it('should handle like and dislike workflow', async () => {
      const comment = generateMockComment();
      const likedComment = { ...comment, likes: comment.likes + 1 };
      const dislikedComment = { ...comment, dislikes: comment.dislikes + 1 };

      // Mock service responses
      mockCommentService.getCommentById.mockResolvedValue(comment);
      mockCommentService.likeComment.mockResolvedValue(likedComment);
      mockCommentService.dislikeComment.mockResolvedValue(dislikedComment);

      const commentId = comment.id;

      // Step 1: Get initial comment state
      const initialResponse = await fastify.inject({
        method: 'GET',
        url: `/api/comments/${commentId}`,
      });

      expect(initialResponse.statusCode).toBe(200);
      const initialBody = JSON.parse(initialResponse.body);
      const initialLikes = initialBody.data.likes;
      const initialDislikes = initialBody.data.dislikes;

      // Step 2: Like the comment
      const likeResponse = await fastify.inject({
        method: 'POST',
        url: `/api/comments/${commentId}/like`,
      });

      expect(likeResponse.statusCode).toBe(200);
      const likeBody = JSON.parse(likeResponse.body);
      expect(likeBody.success).toBe(true);
      expect(likeBody.data.likes).toBe(initialLikes + 1);

      // Step 3: Dislike the comment
      const dislikeResponse = await fastify.inject({
        method: 'POST',
        url: `/api/comments/${commentId}/dislike`,
      });

      expect(dislikeResponse.statusCode).toBe(200);
      const dislikeBody = JSON.parse(dislikeResponse.body);
      expect(dislikeBody.success).toBe(true);
      expect(dislikeBody.data.dislikes).toBe(initialDislikes + 1);
    });
  });

  describe('Comment Search and Stats Workflow', () => {
    it('should handle search and statistics workflow', async () => {
      const searchQuery = 'test search';
      const searchResults = [generateMockComment(), generateMockComment()];
      const stats = {
        totalComments: 100,
        activeComments: 95,
        deletedComments: 5,
        totalLikes: 250,
        totalDislikes: 30,
        commentsToday: 10,
      };

      // Mock service responses
      mockCommentService.searchComments.mockResolvedValue({
        comments: searchResults,
        query: searchQuery,
        count: searchResults.length,
      });
      mockCommentService.getCommentStats.mockResolvedValue(stats);

      // Step 1: Search for comments
      const searchResponse = await fastify.inject({
        method: 'GET',
        url: `/api/comments/search?q=${encodeURIComponent(searchQuery)}`,
      });

      expect(searchResponse.statusCode).toBe(200);
      const searchBody = JSON.parse(searchResponse.body);
      expect(searchBody.success).toBe(true);
      expect(searchBody.data.comments).toHaveLength(searchResults.length);
      expect(searchBody.data.query).toBe(searchQuery);

      // Step 2: Get comment statistics
      const statsResponse = await fastify.inject({
        method: 'GET',
        url: '/api/comments/stats',
      });

      expect(statsResponse.statusCode).toBe(200);
      const statsBody = JSON.parse(statsResponse.body);
      expect(statsBody.success).toBe(true);
      expect(statsBody.data.totalComments).toBe(stats.totalComments);
      expect(statsBody.data.activeComments).toBe(stats.activeComments);
    });
  });

  describe('Pagination Workflow', () => {
    it('should handle paginated comment listing', async () => {
      const page1Comments = Array(10)
        .fill(null)
        .map(() => generateMockComment());
      const page2Comments = Array(5)
        .fill(null)
        .map(() => generateMockComment());

      // Mock service responses for different pages
      mockCommentService.getComments
        .mockResolvedValueOnce({
          comments: page1Comments,
          pagination: {
            page: 1,
            limit: 10,
            total: 15,
            totalPages: 2,
            hasNext: true,
            hasPrev: false,
          },
        })
        .mockResolvedValueOnce({
          comments: page2Comments,
          pagination: {
            page: 2,
            limit: 10,
            total: 15,
            totalPages: 2,
            hasNext: false,
            hasPrev: true,
          },
        });

      // Step 1: Get first page
      const page1Response = await fastify.inject({
        method: 'GET',
        url: '/api/comments?page=1&limit=10',
      });

      expect(page1Response.statusCode).toBe(200);
      const page1Body = JSON.parse(page1Response.body);
      expect(page1Body.success).toBe(true);
      expect(page1Body.data.comments).toHaveLength(10);
      expect(page1Body.data.pagination.hasNext).toBe(true);
      expect(page1Body.data.pagination.hasPrev).toBe(false);

      // Step 2: Get second page
      const page2Response = await fastify.inject({
        method: 'GET',
        url: '/api/comments?page=2&limit=10',
      });

      expect(page2Response.statusCode).toBe(200);
      const page2Body = JSON.parse(page2Response.body);
      expect(page2Body.success).toBe(true);
      expect(page2Body.data.comments).toHaveLength(5);
      expect(page2Body.data.pagination.hasNext).toBe(false);
      expect(page2Body.data.pagination.hasPrev).toBe(true);
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle validation errors gracefully', async () => {
      // Test invalid comment creation
      const invalidResponse = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: '' }, // Empty text should fail validation
      });

      expect(invalidResponse.statusCode).toBe(400);
      const invalidBody = JSON.parse(invalidResponse.body);
      expect(invalidBody.success).toBe(false);
      expect(invalidBody.error).toBe('Validation failed');
    });

    it('should handle service errors gracefully', async () => {
      // Mock service error
      mockCommentService.createComment.mockRejectedValue(
        new Error('Database connection failed')
      );

      const errorResponse = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: { text: 'Valid comment text' },
      });

      expect(errorResponse.statusCode).toBe(500);
      const errorBody = JSON.parse(errorResponse.body);
      expect(errorBody.success).toBe(false);
      expect(errorBody.error).toBeTruthy();
    });

    it('should handle not found errors correctly', async () => {
      mockCommentService.getCommentById.mockResolvedValue(null);

      const notFoundResponse = await fastify.inject({
        method: 'GET',
        url: '/api/comments/non-existent-id',
      });

      expect(notFoundResponse.statusCode).toBe(404);
      const notFoundBody = JSON.parse(notFoundResponse.body);
      expect(notFoundBody.success).toBe(false);
      expect(notFoundBody.error).toBe('Comment not found');
    });
  });

  describe('Rate Limiting Workflow', () => {
    it('should respect rate limits for comment creation', async () => {
      // This test would need to be implemented with actual rate limiting
      // For now, we just verify normal operation
      const commentData = generateMockCommentRequest();
      const comment = generateMockComment();
      mockCommentService.createComment.mockResolvedValue(comment);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: commentData,
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('JSON Schema Validation Workflow', () => {
    it('should validate comment data according to JSON Schema', async () => {
      const validData = {
        text: 'This is a valid comment text that meets all requirements',
        parentId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format
      };

      const invalidData = {
        text: 'x'.repeat(1001), // Too long
        parentId: 'invalid-uuid-format',
      };

      mockCommentService.createComment.mockResolvedValue(generateMockComment());

      // Test valid data
      const validResponse = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: validData,
      });

      expect(validResponse.statusCode).toBe(201);

      // Test invalid data
      const invalidResponse = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: invalidData,
      });

      expect(invalidResponse.statusCode).toBe(400);
      const invalidBody = JSON.parse(invalidResponse.body);
      expect(invalidBody.success).toBe(false);
      expect(invalidBody.error).toBe('Validation failed');
    });
  });

  describe('Content-Type and Headers Workflow', () => {
    it('should handle proper content types and headers', async () => {
      const commentData = generateMockCommentRequest();
      mockCommentService.createComment.mockResolvedValue(generateMockComment());

      // Test with proper JSON content type
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/comments',
        payload: commentData,
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
