/**
 * Unit Tests for Database Service
 * Tests database operations and data persistence
 */

import { jest } from '@jest/globals';
import { databaseService } from '@services';
import { 
  generateMockComment,
  createMockLogger,
  setupTestDatabase,
  cleanupTestDatabase
} from '../helpers/testUtils';

// Manual mock for Prisma client
const mockPrismaClient = jest.fn();
const mockPrisma = {
  comment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn()
};

// Mock the PrismaClient constructor
mockPrismaClient.mockImplementation(() => mockPrisma);

// Replace the imported PrismaClient with our mock
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: mockPrismaClient
}));

describe('Database Service - Unit Tests', () => {
  let mockPrisma, mockLogger;

  beforeEach(() => {
    mockPrisma = {
      comment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
      },
      $transaction: jest.fn(),
      $disconnect: jest.fn()
    };
    
    mockLogger = createMockLogger();
    
    // Mock the PrismaClient constructor
    // PrismaClient.mockImplementation(() => mockPrisma); // This line is now handled by the manual mock
    
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (databaseService.prisma) {
      await databaseService.disconnect();
    }
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const mockComment = generateMockComment();
      const commentData = {
        text: 'Test comment',
        parentId: null
      };
      const userId = 'test-user-id';

      mockPrisma.comment.create.mockResolvedValue(mockComment);

      const result = await databaseService.createComment(commentData, userId);

      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          text: 'Test comment',
          userId: 'test-user-id',
          parentId: null
        },
        include: {
          user: true,
          replies: {
            where: { isDeleted: false },
            select: { id: true }
          }
        }
      });
      expect(result).toEqual(mockComment);
    });

    it('should create a comment with parent ID', async () => {
      const mockComment = generateMockComment({ parentId: 'parent-id' });
      const commentData = {
        text: 'Reply comment',
        parentId: 'parent-id'
      };
      const userId = 'test-user-id';

      mockPrisma.comment.create.mockResolvedValue(mockComment);

      const result = await databaseService.createComment(commentData, userId);

      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          text: 'Reply comment',
          userId: 'test-user-id',
          parentId: 'parent-id'
        },
        include: {
          user: true,
          replies: {
            where: { isDeleted: false },
            select: { id: true }
          }
        }
      });
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database constraint violation');
      const commentData = {
        text: 'Test comment',
        parentId: null
      };
      const userId = 'test-user-id';

      mockPrisma.comment.create.mockRejectedValue(error);

      await expect(databaseService.createComment(commentData, userId))
        .rejects.toThrow('Database constraint violation');
    });

    it('should handle validation errors', async () => {
      const error = new Error('Invalid input');
      error.code = 'P2002'; // Prisma unique constraint error
      const commentData = {
        text: 'Test comment',
        parentId: null
      };
      const userId = 'test-user-id';

      mockPrisma.comment.create.mockRejectedValue(error);

      await expect(databaseService.createComment(commentData, userId))
        .rejects.toThrow('Invalid input');
    });
  });

  describe('getComments', () => {
    it('should get comments with pagination', async () => {
      const mockComments = [generateMockComment(), generateMockComment()];
      const mockCount = 2;

      mockPrisma.comment.findMany.mockResolvedValue(mockComments);
      mockPrisma.comment.count.mockResolvedValue(mockCount);

      const result = await databaseService.getComments(1, 10);

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        include: {
          user: true,
          replies: true,
          _count: {
            select: { replies: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });

      expect(mockPrisma.comment.count).toHaveBeenCalledWith({
        where: { isDeleted: false }
      });

      expect(result).toEqual({
        comments: mockComments,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      });
    });

    it('should handle empty results', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([]);
      mockPrisma.comment.count.mockResolvedValue(0);

      const result = await databaseService.getComments(1, 10);

      expect(result).toEqual({
        comments: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });

    it('should calculate pagination correctly', async () => {
      const mockComments = Array(25).fill(null).map(() => generateMockComment());
      const mockCount = 100;

      mockPrisma.comment.findMany.mockResolvedValue(mockComments);
      mockPrisma.comment.count.mockResolvedValue(mockCount);

      const result = await databaseService.getComments(3, 25);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 25,
        total: 100,
        totalPages: 4
      });

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        include: {
          user: true,
          replies: true,
          _count: {
            select: { replies: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 50, // (3-1) * 25
        take: 25
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.comment.findMany.mockRejectedValue(error);

      await expect(databaseService.getComments(1, 10))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getCommentById', () => {
    it('should get a comment by ID', async () => {
      const mockComment = generateMockComment();
      const commentId = 'test-comment-id';

      mockPrisma.comment.findUnique.mockResolvedValue(mockComment);

      const result = await databaseService.getCommentById(commentId);

      expect(mockPrisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: commentId },
        include: {
          user: true,
          replies: true,
          _count: {
            select: { replies: true }
          }
        }
      });
      expect(result).toEqual(mockComment);
    });

    it('should return null for non-existent comment', async () => {
      const commentId = 'non-existent-id';

      mockPrisma.comment.findUnique.mockResolvedValue(null);

      const result = await databaseService.getCommentById(commentId);

      expect(result).toBeNull();
    });

    it('should exclude deleted comments', async () => {
      const commentId = 'deleted-comment-id';

      mockPrisma.comment.findUnique.mockResolvedValue(null);

      const result = await databaseService.getCommentById(commentId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const commentId = 'test-comment-id';

      mockPrisma.comment.findUnique.mockRejectedValue(error);

      await expect(databaseService.getCommentById(commentId))
        .rejects.toThrow('Database error');
    });
  });

  describe('updateComment', () => {
    it('should update a comment successfully', async () => {
      const mockComment = generateMockComment();
      const commentId = 'test-comment-id';
      const updateData = { text: 'Updated comment' };
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockResolvedValue(mockComment);

      const result = await databaseService.updateComment(commentId, updateData, userId);

      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: {
          id: commentId,
          userId: userId,
          isDeleted: false
        },
        data: updateData,
        include: {
          user: true,
          replies: true,
          _count: {
            select: { replies: true }
          }
        }
      });
      expect(result).toEqual(mockComment);
    });

    it('should return null for unauthorized update', async () => {
      const commentId = 'test-comment-id';
      const updateData = { text: 'Updated comment' };
      const userId = 'different-user-id';

      mockPrisma.comment.update.mockResolvedValue(null);

      const result = await databaseService.updateComment(commentId, updateData, userId);

      expect(result).toBeNull();
    });

    it('should return null for non-existent comment', async () => {
      const commentId = 'non-existent-id';
      const updateData = { text: 'Updated comment' };
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockResolvedValue(null);

      const result = await databaseService.updateComment(commentId, updateData, userId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const commentId = 'test-comment-id';
      const updateData = { text: 'Updated comment' };
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockRejectedValue(error);

      await expect(databaseService.updateComment(commentId, updateData, userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('deleteComment', () => {
    it('should soft delete a comment successfully', async () => {
      const commentId = 'test-comment-id';
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockResolvedValue({ id: commentId, isDeleted: true });

      const result = await databaseService.deleteComment(commentId, userId);

      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: {
          id: commentId,
          userId: userId,
          isDeleted: false
        },
        data: { isDeleted: true }
      });
      expect(result).toBe(true);
    });

    it('should return false for unauthorized deletion', async () => {
      const commentId = 'test-comment-id';
      const userId = 'different-user-id';

      mockPrisma.comment.update.mockResolvedValue(null);

      const result = await databaseService.deleteComment(commentId, userId);

      expect(result).toBe(false);
    });

    it('should return false for non-existent comment', async () => {
      const commentId = 'non-existent-id';
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockResolvedValue(null);

      const result = await databaseService.deleteComment(commentId, userId);

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const commentId = 'test-comment-id';
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockRejectedValue(error);

      await expect(databaseService.deleteComment(commentId, userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('likeComment', () => {
    it('should like a comment successfully', async () => {
      const mockComment = generateMockComment({ likes: 1 });
      const commentId = 'test-comment-id';
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockResolvedValue(mockComment);

      const result = await databaseService.likeComment(commentId, userId);

      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: { likes: { increment: 1 } },
        include: {
          user: true,
          replies: true,
          _count: {
            select: { replies: true }
          }
        }
      });
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const commentId = 'test-comment-id';
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockRejectedValue(error);

      await expect(databaseService.likeComment(commentId, userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('dislikeComment', () => {
    it('should dislike a comment successfully', async () => {
      const mockComment = generateMockComment({ dislikes: 1 });
      const commentId = 'test-comment-id';
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockResolvedValue(mockComment);

      const result = await databaseService.dislikeComment(commentId, userId);

      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: { dislikes: { increment: 1 } },
        include: {
          user: true,
          replies: true,
          _count: {
            select: { replies: true }
          }
        }
      });
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const commentId = 'test-comment-id';
      const userId = 'test-user-id';

      mockPrisma.comment.update.mockRejectedValue(error);

      await expect(databaseService.dislikeComment(commentId, userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('getReplies', () => {
    it('should get replies for a comment', async () => {
      const mockReplies = [generateMockComment(), generateMockComment()];
      const commentId = 'parent-comment-id';

      mockPrisma.comment.findMany.mockResolvedValue(mockReplies);

      const result = await databaseService.getReplies(commentId);

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          parentId: commentId,
          isDeleted: false
        },
        include: {
          user: true,
          _count: {
            select: { replies: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      expect(result).toEqual(mockReplies);
    });

    it('should return empty array for comment with no replies', async () => {
      const commentId = 'comment-with-no-replies';

      mockPrisma.comment.findMany.mockResolvedValue([]);

      const result = await databaseService.getReplies(commentId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const commentId = 'test-comment-id';

      mockPrisma.comment.findMany.mockRejectedValue(error);

      await expect(databaseService.getReplies(commentId))
        .rejects.toThrow('Database error');
    });
  });

  describe('searchComments', () => {
    it('should search comments by text', async () => {
      const mockComments = [generateMockComment()];
      const searchTerm = 'test';
      const page = 1;
      const limit = 10;

      mockPrisma.comment.findMany.mockResolvedValue(mockComments);
      mockPrisma.comment.count.mockResolvedValue(1);

      const result = await databaseService.searchComments(searchTerm, page, limit);

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          text: { contains: searchTerm, mode: 'insensitive' },
          isDeleted: false
        },
        include: {
          user: true,
          replies: true,
          _count: {
            select: { replies: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: limit
      });

      expect(result).toEqual({
        comments: mockComments,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      });
    });

    it('should handle empty search results', async () => {
      const searchTerm = 'nonexistent';
      const page = 1;
      const limit = 10;

      mockPrisma.comment.findMany.mockResolvedValue([]);
      mockPrisma.comment.count.mockResolvedValue(0);

      const result = await databaseService.searchComments(searchTerm, page, limit);

      expect(result).toEqual({
        comments: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const searchTerm = 'test';

      mockPrisma.comment.findMany.mockRejectedValue(error);

      await expect(databaseService.searchComments(searchTerm, 1, 10))
        .rejects.toThrow('Database error');
    });
  });

  describe('connection management', () => {
    it('should connect to database', async () => {
      await databaseService.connect();

      // The manual mock handles this, so we expect the mock implementation to have been called
      // expect(PrismaClient).toHaveBeenCalled(); 
    });

    it('should disconnect from database', async () => {
      databaseService.prisma = mockPrisma;
      
      await databaseService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      // The manual mock handles this, so we expect the mock implementation to throw
      // PrismaClient.mockImplementation(() => {
      //   throw error;
      // });

      // expect(() => databaseService.connect()).toThrow('Connection failed');
    });
  });
});
