/**
 * Unit Tests for Comment Service
 * Tests business logic and data operations using new BaseService architecture
 */

import { jest } from '@jest/globals';
import { CommentService } from '@app/services';
import { CommentRepository } from '@app/repositories';
import {
  generateMockComment,
  generateMockCommentRequest,
  generateMockCommentUpdateRequest,
  createMockLogger,
} from '../helpers/testUtils';
import {
  ValidationError,
  NotFoundError,
  BusinessLogicError,
} from '@app/shared/utils/index.js';

// Mock the CommentRepository
jest.mock('@app/repositories', () => ({
  CommentRepository: jest.fn().mockImplementation(() => ({
    getAllComments: jest.fn(),
    getComments: jest.fn(), // Add this method
    getCommentById: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    getCommentStats: jest.fn(),
    likeComment: jest.fn(),
    dislikeComment: jest.fn(),
  })),
}));

describe('Comment Service - Unit Tests', () => {
  let commentService;
  let mockRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new CommentRepository();
    commentService = new CommentService();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const mockComment = generateMockComment();
      const commentData = generateMockCommentRequest();

      mockRepository.createComment.mockResolvedValue(mockComment);
      commentService.dbService = mockRepository;

      const result = await commentService.createComment({
        text: commentData.text,
        parentId: commentData.parentId,
      });

      expect(mockRepository.createComment).toHaveBeenCalledWith(
        {
          text: commentData.text,
          parentId: commentData.parentId,
        },
        undefined
      );
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const commentData = generateMockCommentRequest();

      mockRepository.createComment.mockRejectedValue(error);
      commentService.dbService = mockRepository;

      await expect(
        commentService.createComment({
          text: commentData.text,
          parentId: commentData.parentId,
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getAllComments', () => {
    it('should get all comments with options', async () => {
      const mockComments = [generateMockComment(), generateMockComment()];

      mockRepository.getComments.mockResolvedValue(mockComments);
      commentService.dbService = mockRepository;

      const result = await commentService.getAllComments({
        page: 1,
        limit: 10,
      });

      expect(mockRepository.getComments).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockComments);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockRepository.getComments.mockRejectedValue(error);
      commentService.dbService = mockRepository;

      await expect(commentService.getAllComments()).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getCommentById', () => {
    it('should get a comment by ID', async () => {
      const mockComment = generateMockComment();

      mockRepository.getCommentById.mockResolvedValue(mockComment);
      commentService.dbService = mockRepository;

      const result = await commentService.getCommentById('test-comment-id');

      expect(mockRepository.getCommentById).toHaveBeenCalledWith(
        'test-comment-id'
      );
      expect(result).toEqual(mockComment);
    });

    it('should throw NotFoundError when comment not found', async () => {
      mockRepository.getCommentById.mockResolvedValue(null);
      commentService.dbService = mockRepository;

      await expect(
        commentService.getCommentById('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockRepository.getCommentById.mockRejectedValue(error);
      commentService.dbService = mockRepository;

      await expect(
        commentService.getCommentById('test-comment-id')
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateComment', () => {
    it('should update a comment successfully', async () => {
      const mockComment = generateMockComment();
      const updateData = generateMockCommentUpdateRequest();

      mockRepository.updateComment.mockResolvedValue(mockComment);
      commentService.dbService = mockRepository;

      const result = await commentService.updateComment('test-comment-id', {
        text: updateData.text,
      });

      expect(mockRepository.updateComment).toHaveBeenCalledWith(
        'test-comment-id',
        { text: updateData.text },
        undefined
      );
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockRepository.updateComment.mockRejectedValue(error);
      commentService.dbService = mockRepository;

      await expect(
        commentService.updateComment('test-comment-id', {
          text: 'Updated text',
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment successfully', async () => {
      const deleteResult = { success: true };
      mockRepository.deleteComment.mockResolvedValue(deleteResult);
      commentService.dbService = mockRepository;

      const result = await commentService.deleteComment('test-comment-id');

      expect(mockRepository.deleteComment).toHaveBeenCalledWith(
        'test-comment-id'
      );
      expect(result).toEqual(deleteResult);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockRepository.deleteComment.mockRejectedValue(error);
      commentService.dbService = mockRepository;

      await expect(
        commentService.deleteComment('test-comment-id')
      ).rejects.toThrow('Database error');
    });
  });

  describe('likeComment', () => {
    it('should like a comment successfully', async () => {
      const mockComment = generateMockComment({ likes: 1 });

      mockRepository.likeComment.mockResolvedValue(mockComment);
      commentService.dbService = mockRepository;

      const result = await commentService.likeComment('test-comment-id');

      expect(mockRepository.likeComment).toHaveBeenCalledWith(
        'test-comment-id'
      );
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockRepository.likeComment.mockRejectedValue(error);
      commentService.dbService = mockRepository;

      await expect(
        commentService.likeComment('test-comment-id')
      ).rejects.toThrow('Database error');
    });
  });

  describe('dislikeComment', () => {
    it('should dislike a comment successfully', async () => {
      const mockComment = generateMockComment({ dislikes: 1 });

      mockRepository.dislikeComment.mockResolvedValue(mockComment);
      commentService.dbService = mockRepository;

      const result = await commentService.dislikeComment('test-comment-id');

      expect(mockRepository.dislikeComment).toHaveBeenCalledWith(
        'test-comment-id'
      );
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockRepository.dislikeComment.mockRejectedValue(error);
      commentService.dbService = mockRepository;

      await expect(
        commentService.dislikeComment('test-comment-id')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getCommentStats', () => {
    it('should get comment statistics successfully', async () => {
      const mockStats = { total: 10, active: 8, deleted: 2 };

      mockRepository.getCommentStats.mockResolvedValue(mockStats);
      commentService.dbService = mockRepository;

      const result = await commentService.getCommentStats();

      expect(mockRepository.getCommentStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockRepository.getCommentStats.mockRejectedValue(error);
      commentService.dbService = mockRepository;

      await expect(commentService.getCommentStats()).rejects.toThrow(
        'Database error'
      );
    });
  });
});
