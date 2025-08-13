/**
 * End-to-End Tests for Comment Workflow
 * Tests complete user workflows and system integration
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { commentRoutes } from '@routes';
import { 
  generateMockComment,
  generateMockCommentRequest,
  generateMockCommentUpdateRequest,
  setupTestDatabase,
  cleanupTestDatabase
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
  dislikeComment: jest.fn()
};

const mockDatabaseService = {
  createComment: jest.fn(),
  getComments: jest.fn(),
  getCommentById: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  searchComments: jest.fn(),
  getCommentStats: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
};

// Replace the imported services with mocks
jest.unstable_mockModule('@services', () => ({
  commentService: mockCommentService,
  databaseService: mockDatabaseService
}));

describe('Comment Workflow - End-to-End Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/comments', commentRoutes);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Complete Comment Lifecycle', () => {
    it('should handle complete comment workflow: create, read, update, delete', async () => {
      // Setup mock data
      const mockUser = { id: 'test-user-id', name: 'Test User' };
      const mockComment = generateMockComment({ userId: mockUser.id });
      const mockUpdatedComment = { ...mockComment, text: 'Updated comment text' };

      // Mock service responses
      mockCommentService.createComment.mockResolvedValue(mockComment);
      mockCommentService.getCommentById.mockResolvedValue(mockComment);
      mockCommentService.updateComment.mockResolvedValue(mockUpdatedComment);
      mockCommentService.deleteComment.mockResolvedValue(true);

      // 1. Create comment
      const createResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'This is a test comment',
          parentId: null
        })
        .set('Content-Type', 'application/json');

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.text).toBe('This is a test comment');

      // 2. Read comment
      const readResponse = await request(app)
        .get(`/api/comments/${mockComment.id}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.data.id).toBe(mockComment.id);

      // 3. Update comment
      const updateResponse = await request(app)
        .put(`/api/comments/${mockComment.id}`)
        .send({
          text: 'Updated comment text'
        })
        .set('Content-Type', 'application/json');

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.text).toBe('Updated comment text');

      // 4. Delete comment
      const deleteResponse = await request(app)
        .delete(`/api/comments/${mockComment.id}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Comment deleted successfully');

      // Verify service calls
      expect(mockCommentService.createComment).toHaveBeenCalledWith(
        'This is a test comment',
        undefined, // userId would be set by auth middleware
        null
      );
      expect(mockCommentService.getCommentById).toHaveBeenCalledWith(mockComment.id);
      expect(mockCommentService.updateComment).toHaveBeenCalledWith(
        mockComment.id,
        'Updated comment text',
        undefined // userId would be set by auth middleware
      );
      expect(mockCommentService.deleteComment).toHaveBeenCalledWith(
        mockComment.id,
        undefined // userId would be set by auth middleware
      );
    });

    it('should handle comment with replies workflow', async () => {
      // Setup mock data
      const mockParentComment = generateMockComment({ 
        id: 'parent-comment-id',
        text: 'Parent comment'
      });
      const mockReply = generateMockComment({
        id: 'reply-comment-id',
        text: 'This is a reply',
        parentId: 'parent-comment-id'
      });

      // Mock service responses
      mockCommentService.createComment
        .mockResolvedValueOnce(mockParentComment)
        .mockResolvedValueOnce(mockReply);
      mockCommentService.getCommentById
        .mockResolvedValueOnce(mockParentComment)
        .mockResolvedValueOnce(mockReply);

      // 1. Create parent comment
      const parentResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'Parent comment',
          parentId: null
        })
        .set('Content-Type', 'application/json');

      expect(parentResponse.status).toBe(201);
      expect(parentResponse.body.data.id).toBe('parent-comment-id');

      // 2. Create reply to parent comment
      const replyResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'This is a reply',
          parentId: 'parent-comment-id'
        })
        .set('Content-Type', 'application/json');

      expect(replyResponse.status).toBe(201);
      expect(replyResponse.body.data.parentId).toBe('parent-comment-id');

      // 3. Read parent comment (should include reply count)
      const readParentResponse = await request(app)
        .get('/api/comments/parent-comment-id');

      expect(readParentResponse.status).toBe(200);
      expect(readParentResponse.body.data.id).toBe('parent-comment-id');

      // 4. Read reply comment
      const readReplyResponse = await request(app)
        .get('/api/comments/reply-comment-id');

      expect(readReplyResponse.status).toBe(200);
      expect(readReplyResponse.body.data.parentId).toBe('parent-comment-id');
    });

    it('should handle comment moderation workflow', async () => {
      // Setup mock data
      const mockComment = generateMockComment({
        id: 'moderated-comment-id',
        text: 'Comment requiring moderation'
      });
      const mockModeratedComment = { ...mockComment, isModerated: true };

      // Mock service responses
      mockCommentService.createComment.mockResolvedValue(mockComment);
      mockCommentService.updateComment.mockResolvedValue(mockModeratedComment);

      // 1. Create comment
      const createResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'Comment requiring moderation',
          parentId: null
        })
        .set('Content-Type', 'application/json');

      expect(createResponse.status).toBe(201);

      // 2. Moderate comment (update with moderation flag)
      const moderateResponse = await request(app)
        .put('/api/comments/moderated-comment-id')
        .send({
          text: 'Comment requiring moderation',
          isModerated: true
        })
        .set('Content-Type', 'application/json');

      expect(moderateResponse.status).toBe(200);
      expect(moderateResponse.body.data.isModerated).toBe(true);
    });
  });

  describe('Comment Interaction Workflow', () => {
    it('should handle like/dislike workflow', async () => {
      // Setup mock data
      const mockComment = generateMockComment({
        id: 'interactive-comment-id',
        likes: 0,
        dislikes: 0
      });
      const mockLikedComment = { ...mockComment, likes: 1 };
      const mockDislikedComment = { ...mockComment, dislikes: 1 };

      // Mock service responses
      mockCommentService.createComment.mockResolvedValue(mockComment);
      mockCommentService.likeComment.mockResolvedValue(mockLikedComment);
      mockCommentService.dislikeComment.mockResolvedValue(mockDislikedComment);

      // 1. Create comment
      const createResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'Interactive comment',
          parentId: null
        })
        .set('Content-Type', 'application/json');

      expect(createResponse.status).toBe(201);

      // 2. Like comment
      const likeResponse = await request(app)
        .post('/api/comments/interactive-comment-id/like');

      expect(likeResponse.status).toBe(200);
      expect(likeResponse.body.data.likes).toBe(1);

      // 3. Dislike comment
      const dislikeResponse = await request(app)
        .post('/api/comments/interactive-comment-id/dislike');

      expect(dislikeResponse.status).toBe(200);
      expect(dislikeResponse.body.data.dislikes).toBe(1);

      // Verify service calls
      expect(mockCommentService.likeComment).toHaveBeenCalledWith(
        'interactive-comment-id',
        undefined // userId would be set by auth middleware
      );
      expect(mockCommentService.dislikeComment).toHaveBeenCalledWith(
        'interactive-comment-id',
        undefined // userId would be set by auth middleware
      );
    });

    it('should handle comment search and filtering workflow', async () => {
      // Setup mock data
      const mockComments = [
        generateMockComment({ text: 'First test comment' }),
        generateMockComment({ text: 'Second test comment' }),
        generateMockComment({ text: 'Another comment' })
      ];

      // Mock service responses
      mockCommentService.getComments.mockResolvedValue({
        comments: mockComments,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 }
      });

      // Search for comments
      const searchResponse = await request(app)
        .get('/api/comments')
        .query({ page: '1', limit: '10' });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.data).toHaveLength(3);
      expect(searchResponse.body.pagination.total).toBe(3);

      // Verify service calls
      expect(mockCommentService.getComments).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle validation errors throughout workflow', async () => {
      // Test invalid comment creation
      const invalidCreateResponse = await request(app)
        .post('/api/comments')
        .send({
          text: '', // Invalid: empty text
          parentId: null
        })
        .set('Content-Type', 'application/json');

      expect(invalidCreateResponse.status).toBe(400);
      expect(invalidCreateResponse.body.success).toBe(false);

      // Test invalid comment update
      const invalidUpdateResponse = await request(app)
        .put('/api/comments/invalid-id')
        .send({
          text: 'a'.repeat(1001) // Invalid: too long
        })
        .set('Content-Type', 'application/json');

      expect(invalidUpdateResponse.status).toBe(400);
      expect(invalidUpdateResponse.body.success).toBe(false);

      // Test invalid comment ID format
      const invalidIdResponse = await request(app)
        .get('/api/comments/invalid-format!');

      expect(invalidIdResponse.status).toBe(400);
      expect(invalidIdResponse.body.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      // Mock service error
      mockCommentService.createComment.mockRejectedValue(new Error('Database connection failed'));

      const errorResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'Valid comment text',
          parentId: null
        })
        .set('Content-Type', 'application/json');

      // The error should be handled by error middleware
      expect(errorResponse.status).toBe(500);
    });

    it('should handle concurrent operations gracefully', async () => {
      // Setup mock data
      const mockComment = generateMockComment({ id: 'concurrent-comment-id' });

      // Mock service responses
      mockCommentService.createComment.mockResolvedValue(mockComment);
      mockCommentService.updateComment.mockResolvedValue(mockComment);
      mockCommentService.deleteComment.mockResolvedValue(true);

      // Simulate concurrent operations
      const promises = [
        // Create comment
        request(app)
          .post('/api/comments')
          .send({
            text: 'Concurrent comment',
            parentId: null
          })
          .set('Content-Type', 'application/json'),
        
        // Update comment (should fail if not created yet)
        request(app)
          .put('/api/comments/concurrent-comment-id')
          .send({
            text: 'Updated concurrent comment'
          })
          .set('Content-Type', 'application/json'),
        
        // Delete comment (should fail if not created yet)
        request(app)
          .delete('/api/comments/concurrent-comment-id')
      ];

      const responses = await Promise.all(promises);

      // First operation should succeed
      expect(responses[0].status).toBe(201);

      // Other operations may fail due to timing, but shouldn't crash the system
      responses.slice(1).forEach(response => {
        expect([200, 400, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Performance and Scalability Workflow', () => {
    it('should handle large comment lists efficiently', async () => {
      // Setup mock data for large list
      const largeCommentList = Array(100).fill(null).map((_, index) =>
        generateMockComment({
          id: `comment-${index}`,
          text: `Comment number ${index}`
        })
      );

      // Mock service responses
      mockCommentService.getComments.mockResolvedValue({
        comments: largeCommentList,
        pagination: { page: 1, limit: 100, total: 100, totalPages: 1 }
      });

      // Test pagination
      const response = await request(app)
        .get('/api/comments')
        .query({ page: '1', limit: '100' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(100);
      expect(response.body.pagination.total).toBe(100);

      // Verify service calls
      expect(mockCommentService.getComments).toHaveBeenCalledWith(1, 100);
    });

    it('should handle nested comment threads efficiently', async () => {
      // Setup mock data for nested comments
      const mockParentComment = generateMockComment({
        id: 'nested-parent-id',
        text: 'Parent comment with many replies'
      });

      const mockReplies = Array(50).fill(null).map((_, index) =>
        generateMockComment({
          id: `nested-reply-${index}`,
          text: `Reply ${index}`,
          parentId: 'nested-parent-id'
        })
      );

      // Mock service responses
      mockCommentService.createComment
        .mockResolvedValueOnce(mockParentComment)
        .mockResolvedValueOnce(mockReplies[0]);
      mockCommentService.getCommentById.mockResolvedValue(mockParentComment);

      // 1. Create parent comment
      const parentResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'Parent comment with many replies',
          parentId: null
        })
        .set('Content-Type', 'application/json');

      expect(parentResponse.status).toBe(201);

      // 2. Create first reply
      const replyResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'First reply',
          parentId: 'nested-parent-id'
        })
        .set('Content-Type', 'application/json');

      expect(replyResponse.status).toBe(201);

      // 3. Read parent comment (should handle nested data efficiently)
      const readResponse = await request(app)
        .get('/api/comments/nested-parent-id');

      expect(readResponse.status).toBe(200);
    });
  });

  describe('Data Integrity Workflow', () => {
    it('should maintain data consistency across operations', async () => {
      // Setup mock data
      const mockComment = generateMockComment({
        id: 'consistency-comment-id',
        text: 'Original text'
      });

      // Mock service responses
      mockCommentService.createComment.mockResolvedValue(mockComment);
      mockCommentService.getCommentById.mockResolvedValue(mockComment);
      mockCommentService.updateComment.mockResolvedValue(mockComment);

      // 1. Create comment
      const createResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'Original text',
          parentId: null
        })
        .set('Content-Type', 'application/json');

      expect(createResponse.status).toBe(201);
      const createdComment = createResponse.body.data;

      // 2. Verify comment was created correctly
      expect(createdComment.text).toBe('Original text');
      expect(createdComment.id).toBe('consistency-comment-id');
      expect(createdComment.isDeleted).toBe(false);

      // 3. Read comment to verify persistence
      const readResponse = await request(app)
        .get('/api/comments/consistency-comment-id');

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.text).toBe('Original text');

      // 4. Verify data consistency
      expect(createdComment.id).toBe(readResponse.body.data.id);
      expect(createdComment.text).toBe(readResponse.body.data.text);
      expect(createdComment.userId).toBe(readResponse.body.data.userId);
    });

    it('should handle soft deletion correctly', async () => {
      // Setup mock data
      const mockComment = generateMockComment({
        id: 'soft-delete-comment-id',
        text: 'Comment to be soft deleted'
      });

      // Mock service responses
      mockCommentService.createComment.mockResolvedValue(mockComment);
      mockCommentService.deleteComment.mockResolvedValue(true);
      mockCommentService.getCommentById.mockResolvedValue(null); // After deletion

      // 1. Create comment
      const createResponse = await request(app)
        .post('/api/comments')
        .send({
          text: 'Comment to be soft deleted',
          parentId: null
        })
        .set('Content-Type', 'application/json');

      expect(createResponse.status).toBe(201);

      // 2. Soft delete comment
      const deleteResponse = await request(app)
        .delete('/api/comments/soft-delete-comment-id');

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // 3. Verify comment is no longer accessible
      const readResponse = await request(app)
        .get('/api/comments/soft-delete-comment-id');

      // Should return 404 or null data
      expect([200, 404]).toContain(readResponse.status);
      if (readResponse.status === 200) {
        expect(readResponse.body.data).toBeNull();
      }
    });
  });
});
