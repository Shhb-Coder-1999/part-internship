/**
 * Unit Tests for Comment Controller
 * Tests individual controller methods using new BaseController architecture
 */

import { jest } from '@jest/globals';
import { CommentController } from '@app/controllers';
import { CommentService } from '@app/services';
import {
  generateMockComment,
  generateMockCommentRequest,
  generateMockCommentUpdateRequest,
} from '../helpers/testUtils';
import { HTTP_STATUS, API_MESSAGES } from '@app/constants';

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

describe('Comment Controller - Unit Tests', () => {
  let commentController;
  let mockService;
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = new CommentService();
    commentController = new CommentController();
    commentController.service = mockService;

    req = {
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('Controller Initialization', () => {
    it('should be properly configured as BaseController extension', () => {
      expect(commentController).toBeDefined();
      expect(typeof commentController.getAllComments).toBe('function');
      expect(typeof commentController.createComment).toBe('function');
      expect(typeof commentController.updateComment).toBe('function');
      expect(typeof commentController.deleteComment).toBe('function');
      expect(typeof commentController.getCommentById).toBe('function');
      expect(typeof commentController.searchComments).toBe('function');
      expect(typeof commentController.getCommentStats).toBe('function');
      expect(typeof commentController.likeComment).toBe('function');
      expect(typeof commentController.dislikeComment).toBe('function');
    });

    it('should have correct resource name and messages', () => {
      expect(commentController.resourceName).toBe('Comment');
      expect(commentController.successMessages).toHaveProperty('created');
      expect(commentController.successMessages).toHaveProperty('updated');
      expect(commentController.successMessages).toHaveProperty('deleted');
    });
  });

  describe('getAllComments', () => {
    it('should get all comments successfully', async () => {
      const mockComments = [generateMockComment(), generateMockComment()];
      mockService.getAllComments.mockResolvedValue(mockComments);

      await commentController.getAllComments(req, res);

      expect(mockService.getAllComments).toHaveBeenCalledWith({}, {});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockComments,
          message: API_MESSAGES.SUCCESS.COMMENTS_RETRIEVED,
        })
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockService.getAllComments.mockRejectedValue(error);

      await expect(commentController.getAllComments(req, res)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const mockComment = generateMockComment();
      const commentData = generateMockCommentRequest();
      req.body = commentData;

      mockService.createComment.mockResolvedValue(mockComment);

      await commentController.createComment(req, res);

      expect(mockService.createComment).toHaveBeenCalledWith(commentData, {});
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: API_MESSAGES.SUCCESS.COMMENT_CREATED,
        })
      );
    });

    it('should handle service errors during creation', async () => {
      const error = new Error('Creation failed');
      const commentData = generateMockCommentRequest();
      req.body = commentData;

      mockService.createComment.mockRejectedValue(error);

      await expect(commentController.createComment(req, res)).rejects.toThrow(
        'Creation failed'
      );
    });
  });

  describe('updateComment', () => {
    it('should update a comment successfully', async () => {
      const mockComment = generateMockComment();
      const updateData = generateMockCommentUpdateRequest();
      req.params = { id: 'test-comment-id' };
      req.body = updateData;

      mockService.updateComment.mockResolvedValue(mockComment);

      await commentController.updateComment(req, res);

      expect(mockService.updateComment).toHaveBeenCalledWith(
        'test-comment-id',
        updateData,
        {}
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: API_MESSAGES.SUCCESS.COMMENT_UPDATED,
        })
      );
    });

    it('should handle service errors during update', async () => {
      const error = new Error('Update failed');
      req.params = { id: 'test-comment-id' };
      req.body = { text: 'Updated text' };

      mockService.updateComment.mockRejectedValue(error);

      await expect(commentController.updateComment(req, res)).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment successfully', async () => {
      req.params = { id: 'test-comment-id' };

      mockService.deleteComment.mockResolvedValue({ success: true });

      await commentController.deleteComment(req, res);

      expect(mockService.deleteComment).toHaveBeenCalledWith(
        'test-comment-id',
        {}
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: API_MESSAGES.SUCCESS.COMMENT_DELETED,
        })
      );
    });

    it('should handle service errors during deletion', async () => {
      const error = new Error('Deletion failed');
      req.params = { id: 'test-comment-id' };

      mockService.deleteComment.mockRejectedValue(error);

      await expect(commentController.deleteComment(req, res)).rejects.toThrow(
        'Deletion failed'
      );
    });
  });

  describe('getCommentById', () => {
    it('should get a comment by ID successfully', async () => {
      const mockComment = generateMockComment();
      req.params = { id: 'test-comment-id' };

      mockService.getCommentById.mockResolvedValue(mockComment);

      await commentController.getCommentById(req, res);

      expect(mockService.getCommentById).toHaveBeenCalledWith(
        'test-comment-id',
        {}
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockComment,
        })
      );
    });

    it('should handle service errors when getting by ID', async () => {
      const error = new Error('Not found');
      req.params = { id: 'test-comment-id' };

      mockService.getCommentById.mockRejectedValue(error);

      await expect(commentController.getCommentById(req, res)).rejects.toThrow(
        'Not found'
      );
    });
  });

  describe('searchComments', () => {
    it('should search comments successfully', async () => {
      const mockComments = [generateMockComment()];
      req.query = { q: 'search term', limit: 10 };

      mockService.searchComments.mockResolvedValue(mockComments);

      await commentController.searchComments(req, res);

      expect(mockService.searchComments).toHaveBeenCalledWith('search term', {
        limit: 10,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockComments,
        })
      );
    });

    it('should handle service errors during search', async () => {
      const error = new Error('Search failed');
      req.query = { q: 'search term' };

      mockService.searchComments.mockRejectedValue(error);

      await expect(commentController.searchComments(req, res)).rejects.toThrow(
        'Search failed'
      );
    });
  });

  describe('getCommentStats', () => {
    it('should get comment statistics successfully', async () => {
      const mockStats = { total: 10, active: 8, deleted: 2 };

      mockService.getCommentStats.mockResolvedValue(mockStats);

      await commentController.getCommentStats(req, res);

      expect(mockService.getCommentStats).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockStats,
        })
      );
    });

    it('should handle service errors when getting stats', async () => {
      const error = new Error('Stats failed');

      mockService.getCommentStats.mockRejectedValue(error);

      await expect(commentController.getCommentStats(req, res)).rejects.toThrow(
        'Stats failed'
      );
    });
  });

  describe('likeComment', () => {
    it('should like a comment successfully', async () => {
      const mockComment = generateMockComment({ likes: 1 });
      req.params = { id: 'test-comment-id' };

      mockService.likeComment.mockResolvedValue(mockComment);

      await commentController.likeComment(req, res);

      expect(mockService.likeComment).toHaveBeenCalledWith('test-comment-id');
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: API_MESSAGES.SUCCESS.COMMENT_LIKED,
        })
      );
    });

    it('should handle service errors when liking', async () => {
      const error = new Error('Like failed');
      req.params = { id: 'test-comment-id' };

      mockService.likeComment.mockRejectedValue(error);

      await expect(commentController.likeComment(req, res)).rejects.toThrow(
        'Like failed'
      );
    });
  });

  describe('dislikeComment', () => {
    it('should dislike a comment successfully', async () => {
      const mockComment = generateMockComment({ dislikes: 1 });
      req.params = { id: 'test-comment-id' };

      mockService.dislikeComment.mockResolvedValue(mockComment);

      await commentController.dislikeComment(req, res);

      expect(mockService.dislikeComment).toHaveBeenCalledWith(
        'test-comment-id'
      );
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: API_MESSAGES.SUCCESS.COMMENT_DISLIKED,
        })
      );
    });

    it('should handle service errors when disliking', async () => {
      const error = new Error('Dislike failed');
      req.params = { id: 'test-comment-id' };

      mockService.dislikeComment.mockRejectedValue(error);

      await expect(commentController.dislikeComment(req, res)).rejects.toThrow(
        'Dislike failed'
      );
    });
  });
});
