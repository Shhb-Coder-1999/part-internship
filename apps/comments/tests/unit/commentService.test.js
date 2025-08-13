/**
 * Unit Tests for Comment Service
 * Tests business logic and data operations
 */

import { jest } from '@jest/globals';
import { commentService } from '@services';
import { 
  generateMockComment,
  generateMockCommentRequest,
  generateMockCommentUpdateRequest,
  createMockLogger
} from '../helpers/testUtils';

// Manual mock for database service
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

// Replace the imported databaseService with mock
jest.unstable_mockModule('@services', () => ({
  databaseService: mockDatabaseService
}));

describe('Comment Service - Unit Tests', () => {
  let mockLogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const mockComment = generateMockComment();
      const commentData = generateMockCommentRequest();
      
      mockDatabaseService.createComment.mockResolvedValue(mockComment);

      const result = await commentService.createComment(
        commentData.text,
        'test-user-id',
        commentData.parentId,
        mockLogger
      );

      expect(mockDatabaseService.createComment).toHaveBeenCalledWith({
        text: commentData.text,
        userId: 'test-user-id',
        parentId: commentData.parentId
      });
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const commentData = generateMockCommentRequest();
      
      mockDatabaseService.createComment.mockRejectedValue(error);

      await expect(commentService.createComment(
        commentData.text,
        'test-user-id',
        commentData.parentId,
        mockLogger
      )).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating comment',
        expect.any(Object)
      );
    });

    it('should validate comment text length', async () => {
      const longText = 'a'.repeat(1001);
      
      await expect(commentService.createComment(
        longText,
        'test-user-id',
        null,
        mockLogger
      )).rejects.toThrow('Comment text must be between 1 and 1000 characters');

      expect(mockDatabaseService.createComment).not.toHaveBeenCalled();
    });

    it('should validate comment text is not empty', async () => {
      await expect(commentService.createComment(
        '',
        'test-user-id',
        null,
        mockLogger
      )).rejects.toThrow('Comment text is required');

      expect(mockDatabaseService.createComment).not.toHaveBeenCalled();
    });
  });

  describe('getComments', () => {
    it('should get comments with pagination', async () => {
      const mockComments = [generateMockComment(), generateMockComment()];
      const mockPagination = { page: 1, limit: 10, total: 2 };
      
      mockDatabaseService.getComments.mockResolvedValue({
        comments: mockComments,
        pagination: mockPagination
      });

      const result = await commentService.getComments(1, 10, mockLogger);

      expect(mockDatabaseService.getComments).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual({
        comments: mockComments,
        pagination: mockPagination
      });
    });

    it('should use default pagination values', async () => {
      const mockComments = [generateMockComment()];
      
      mockDatabaseService.getComments.mockResolvedValue({
        comments: mockComments,
        pagination: { page: 1, limit: 20, total: 1 }
      });

      await commentService.getComments(undefined, undefined, mockLogger);

      expect(mockDatabaseService.getComments).toHaveBeenCalledWith(1, 20);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDatabaseService.getComments.mockRejectedValue(error);

      await expect(commentService.getComments(1, 10, mockLogger))
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting comments',
        expect.any(Object)
      );
    });

    it('should validate pagination parameters', async () => {
      await expect(commentService.getComments(-1, 10, mockLogger))
        .rejects.toThrow('Page must be a positive integer');

      await expect(commentService.getComments(1, 0, mockLogger))
        .rejects.toThrow('Limit must be between 1 and 100');

      await expect(commentService.getComments(1, 101, mockLogger))
        .rejects.toThrow('Limit must be between 1 and 100');
    });
  });

  describe('getCommentById', () => {
    it('should get a comment by ID', async () => {
      const mockComment = generateMockComment();
      
      mockDatabaseService.getCommentById.mockResolvedValue(mockComment);

      const result = await commentService.getCommentById('test-comment-id', mockLogger);

      expect(mockDatabaseService.getCommentById).toHaveBeenCalledWith('test-comment-id');
      expect(result).toEqual(mockComment);
    });

    it('should handle comment not found', async () => {
      mockDatabaseService.getCommentById.mockResolvedValue(null);

      const result = await commentService.getCommentById('non-existent-id', mockLogger);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDatabaseService.getCommentById.mockRejectedValue(error);

      await expect(commentService.getCommentById('test-comment-id', mockLogger))
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting comment by ID',
        expect.any(Object)
      );
    });

    it('should validate comment ID', async () => {
      await expect(commentService.getCommentById('', mockLogger))
        .rejects.toThrow('Comment ID is required');

      await expect(commentService.getCommentById(null, mockLogger))
        .rejects.toThrow('Comment ID is required');
    });
  });

  describe('updateComment', () => {
    it('should update a comment successfully', async () => {
      const mockComment = generateMockComment();
      const updateData = generateMockCommentUpdateRequest();
      
      mockDatabaseService.updateComment.mockResolvedValue(mockComment);

      const result = await commentService.updateComment(
        'test-comment-id',
        updateData.text,
        'test-user-id',
        mockLogger
      );

      expect(mockDatabaseService.updateComment).toHaveBeenCalledWith(
        'test-comment-id',
        { text: updateData.text },
        'test-user-id'
      );
      expect(result).toEqual(mockComment);
    });

    it('should handle unauthorized update', async () => {
      mockDatabaseService.updateComment.mockResolvedValue(null);

      const result = await commentService.updateComment(
        'test-comment-id',
        'Updated text',
        'different-user-id',
        mockLogger
      );

      expect(result).toBeNull();
    });

    it('should handle comment not found', async () => {
      mockDatabaseService.updateComment.mockResolvedValue(null);

      const result = await commentService.updateComment(
        'non-existent-id',
        'Updated text',
        'test-user-id',
        mockLogger
      );

      expect(result).toBeNull();
    });

    it('should validate update data', async () => {
      await expect(commentService.updateComment(
        'test-comment-id',
        '',
        'test-user-id',
        mockLogger
      )).rejects.toThrow('Comment text is required');

      await expect(commentService.updateComment(
        'test-comment-id',
        'a'.repeat(1001),
        'test-user-id',
        mockLogger
      )).rejects.toThrow('Comment text must be between 1 and 1000 characters');
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDatabaseService.updateComment.mockRejectedValue(error);

      await expect(commentService.updateComment(
        'test-comment-id',
        'Updated text',
        'test-user-id',
        mockLogger
      )).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating comment',
        expect.any(Object)
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment successfully', async () => {
      mockDatabaseService.deleteComment.mockResolvedValue(true);

      const result = await commentService.deleteComment(
        'test-comment-id',
        'test-user-id',
        mockLogger
      );

      expect(mockDatabaseService.deleteComment).toHaveBeenCalledWith(
        'test-comment-id',
        'test-user-id'
      );
      expect(result).toBe(true);
    });

    it('should handle unauthorized deletion', async () => {
      mockDatabaseService.deleteComment.mockResolvedValue(false);

      const result = await commentService.deleteComment(
        'test-comment-id',
        'different-user-id',
        mockLogger
      );

      expect(result).toBe(false);
    });

    it('should handle comment not found', async () => {
      mockDatabaseService.deleteComment.mockResolvedValue(false);

      const result = await commentService.deleteComment(
        'non-existent-id',
        'test-user-id',
        mockLogger
      );

      expect(result).toBe(false);
    });

    it('should validate parameters', async () => {
      await expect(commentService.deleteComment('', 'test-user-id', mockLogger))
        .rejects.toThrow('Comment ID is required');

      await expect(commentService.deleteComment('test-comment-id', '', mockLogger))
        .rejects.toThrow('User ID is required');
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDatabaseService.deleteComment.mockRejectedValue(error);

      await expect(commentService.deleteComment(
        'test-comment-id',
        'test-user-id',
        mockLogger
      )).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting comment',
        expect.any(Object)
      );
    });
  });

  describe('likeComment', () => {
    it('should like a comment successfully', async () => {
      const mockComment = generateMockComment({ likes: 1 });
      
      mockDatabaseService.likeComment.mockResolvedValue(mockComment);

      const result = await commentService.likeComment(
        'test-comment-id',
        'test-user-id',
        mockLogger
      );

      expect(mockDatabaseService.likeComment).toHaveBeenCalledWith(
        'test-comment-id',
        'test-user-id'
      );
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDatabaseService.likeComment.mockRejectedValue(error);

      await expect(commentService.likeComment(
        'test-comment-id',
        'test-user-id',
        mockLogger
      )).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error liking comment',
        expect.any(Object)
      );
    });

    it('should validate parameters', async () => {
      await expect(commentService.likeComment('', 'test-user-id', mockLogger))
        .rejects.toThrow('Comment ID is required');

      await expect(commentService.likeComment('test-comment-id', '', mockLogger))
        .rejects.toThrow('User ID is required');
    });
  });

  describe('dislikeComment', () => {
    it('should dislike a comment successfully', async () => {
      const mockComment = generateMockComment({ dislikes: 1 });
      
      mockDatabaseService.dislikeComment.mockResolvedValue(mockComment);

      const result = await commentService.dislikeComment(
        'test-comment-id',
        'test-user-id',
        mockLogger
      );

      expect(mockDatabaseService.dislikeComment).toHaveBeenCalledWith(
        'test-comment-id',
        'test-user-id'
      );
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDatabaseService.dislikeComment.mockRejectedValue(error);

      await expect(commentService.dislikeComment(
        'test-comment-id',
        'test-user-id',
        mockLogger
      )).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error disliking comment',
        expect.any(Object)
      );
    });

    it('should validate parameters', async () => {
      await expect(commentService.dislikeComment('', 'test-user-id', mockLogger))
        .rejects.toThrow('Comment ID is required');

      await expect(commentService.dislikeComment('test-comment-id', '', mockLogger))
        .rejects.toThrow('User ID is required');
    });
  });
});
