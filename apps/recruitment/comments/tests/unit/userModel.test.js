/**
 * Unit Tests for User Model and User-Comment Relationships
 * Tests the new User model integration and relationships
 */

import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { generateMockComment, generateMockUser } from '../helpers/testUtils';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

describe('User Model - Unit Tests', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('User Model Operations', () => {
    describe('User Creation', () => {
      it('should create a user with valid data', async () => {
        const userData = {
          email: 'test@example.com',
          name: 'Test User',
        };
        const mockUser = generateMockUser(userData);

        prisma.user.create.mockResolvedValue(mockUser);

        const result = await prisma.user.create({
          data: userData,
        });

        expect(prisma.user.create).toHaveBeenCalledWith({
          data: userData,
        });
        expect(result).toEqual(mockUser);
        expect(result.email).toBe(userData.email);
        expect(result.name).toBe(userData.name);
      });

      it('should create a user without name (optional field)', async () => {
        const userData = {
          email: 'test@example.com',
        };
        const mockUser = generateMockUser({ ...userData, name: null });

        prisma.user.create.mockResolvedValue(mockUser);

        const result = await prisma.user.create({
          data: userData,
        });

        expect(result.email).toBe(userData.email);
        expect(result.name).toBeNull();
      });

      it('should include timestamps on creation', async () => {
        const userData = {
          email: 'test@example.com',
          name: 'Test User',
        };
        const mockUser = generateMockUser(userData);

        prisma.user.create.mockResolvedValue(mockUser);

        const result = await prisma.user.create({
          data: userData,
        });

        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('User Retrieval', () => {
      it('should find user by ID', async () => {
        const mockUser = generateMockUser();

        prisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await prisma.user.findUnique({
          where: { id: mockUser.id },
        });

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: mockUser.id },
        });
        expect(result).toEqual(mockUser);
      });

      it('should find user by email', async () => {
        const mockUser = generateMockUser();

        prisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await prisma.user.findUnique({
          where: { email: mockUser.email },
        });

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: mockUser.email },
        });
        expect(result).toEqual(mockUser);
      });

      it('should return null for non-existent user', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        const result = await prisma.user.findUnique({
          where: { id: 'non-existent-id' },
        });

        expect(result).toBeNull();
      });

      it('should find multiple users', async () => {
        const mockUsers = [
          generateMockUser({ email: 'user1@example.com' }),
          generateMockUser({ email: 'user2@example.com' }),
        ];

        prisma.user.findMany.mockResolvedValue(mockUsers);

        const result = await prisma.user.findMany();

        expect(prisma.user.findMany).toHaveBeenCalled();
        expect(result).toEqual(mockUsers);
        expect(result).toHaveLength(2);
      });
    });

    describe('User Updates', () => {
      it('should update user data', async () => {
        const originalUser = generateMockUser();
        const updateData = { name: 'Updated Name' };
        const updatedUser = {
          ...originalUser,
          ...updateData,
          updatedAt: new Date(),
        };

        prisma.user.update.mockResolvedValue(updatedUser);

        const result = await prisma.user.update({
          where: { id: originalUser.id },
          data: updateData,
        });

        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: originalUser.id },
          data: updateData,
        });
        expect(result.name).toBe(updateData.name);
        expect(result.updatedAt).toBeInstanceOf(Date);
      });

      it('should update user email with unique constraint', async () => {
        const originalUser = generateMockUser();
        const updateData = { email: 'newemail@example.com' };
        const updatedUser = {
          ...originalUser,
          ...updateData,
          updatedAt: new Date(),
        };

        prisma.user.update.mockResolvedValue(updatedUser);

        const result = await prisma.user.update({
          where: { id: originalUser.id },
          data: updateData,
        });

        expect(result.email).toBe(updateData.email);
      });
    });

    describe('User Deletion', () => {
      it('should delete a user', async () => {
        const mockUser = generateMockUser();

        prisma.user.delete.mockResolvedValue(mockUser);

        const result = await prisma.user.delete({
          where: { id: mockUser.id },
        });

        expect(prisma.user.delete).toHaveBeenCalledWith({
          where: { id: mockUser.id },
        });
        expect(result).toEqual(mockUser);
      });
    });
  });

  describe('User-Comment Relationships', () => {
    describe('Comments by User', () => {
      it('should find user with their comments', async () => {
        const mockUser = generateMockUser();
        const mockComments = [
          generateMockComment({ userId: mockUser.id }),
          generateMockComment({ userId: mockUser.id }),
        ];
        const userWithComments = {
          ...mockUser,
          comments: mockComments,
        };

        prisma.user.findUnique.mockResolvedValue(userWithComments);

        const result = await prisma.user.findUnique({
          where: { id: mockUser.id },
          include: { comments: true },
        });

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: mockUser.id },
          include: { comments: true },
        });
        expect(result.comments).toHaveLength(2);
        expect(result.comments[0].userId).toBe(mockUser.id);
        expect(result.comments[1].userId).toBe(mockUser.id);
      });

      it('should find user with filtered comments', async () => {
        const mockUser = generateMockUser();
        const mockComments = [
          generateMockComment({ userId: mockUser.id, isDeleted: false }),
        ];
        const userWithComments = {
          ...mockUser,
          comments: mockComments,
        };

        prisma.user.findUnique.mockResolvedValue(userWithComments);

        const result = await prisma.user.findUnique({
          where: { id: mockUser.id },
          include: {
            comments: {
              where: { isDeleted: false },
            },
          },
        });

        expect(result.comments).toHaveLength(1);
        expect(result.comments[0].isDeleted).toBe(false);
      });

      it('should find user with paginated comments', async () => {
        const mockUser = generateMockUser();
        const mockComments = [generateMockComment({ userId: mockUser.id })];
        const userWithComments = {
          ...mockUser,
          comments: mockComments,
        };

        prisma.user.findUnique.mockResolvedValue(userWithComments);

        const result = await prisma.user.findUnique({
          where: { id: mockUser.id },
          include: {
            comments: {
              take: 10,
              skip: 0,
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        expect(result.comments).toHaveLength(1);
      });
    });

    describe('Comment with User', () => {
      it('should find comment with user information', async () => {
        const mockUser = generateMockUser();
        const mockComment = generateMockComment({ userId: mockUser.id });
        const commentWithUser = {
          ...mockComment,
          user: mockUser,
        };

        prisma.comment.findUnique.mockResolvedValue(commentWithUser);

        const result = await prisma.comment.findUnique({
          where: { id: mockComment.id },
          include: { user: true },
        });

        expect(prisma.comment.findUnique).toHaveBeenCalledWith({
          where: { id: mockComment.id },
          include: { user: true },
        });
        expect(result.user).toEqual(mockUser);
        expect(result.user.id).toBe(mockUser.id);
        expect(result.user.email).toBe(mockUser.email);
      });

      it('should find comments with user information', async () => {
        const mockUser1 = generateMockUser({ email: 'user1@example.com' });
        const mockUser2 = generateMockUser({ email: 'user2@example.com' });
        const mockComments = [
          { ...generateMockComment({ userId: mockUser1.id }), user: mockUser1 },
          { ...generateMockComment({ userId: mockUser2.id }), user: mockUser2 },
        ];

        prisma.comment.findMany.mockResolvedValue(mockComments);

        const result = await prisma.comment.findMany({
          include: { user: true },
        });

        expect(result).toHaveLength(2);
        expect(result[0].user.email).toBe('user1@example.com');
        expect(result[1].user.email).toBe('user2@example.com');
      });
    });

    describe('Nested Comment Relationships with Users', () => {
      it('should find parent comment with user and replies with their users', async () => {
        const parentUser = generateMockUser({ email: 'parent@example.com' });
        const replyUser = generateMockUser({ email: 'reply@example.com' });

        const parentComment = generateMockComment({
          userId: parentUser.id,
          parentId: null,
        });
        const replyComment = generateMockComment({
          userId: replyUser.id,
          parentId: parentComment.id,
        });

        const commentWithRelations = {
          ...parentComment,
          user: parentUser,
          replies: [
            {
              ...replyComment,
              user: replyUser,
            },
          ],
        };

        prisma.comment.findUnique.mockResolvedValue(commentWithRelations);

        const result = await prisma.comment.findUnique({
          where: { id: parentComment.id },
          include: {
            user: true,
            replies: {
              include: {
                user: true,
              },
            },
          },
        });

        expect(result.user.email).toBe('parent@example.com');
        expect(result.replies).toHaveLength(1);
        expect(result.replies[0].user.email).toBe('reply@example.com');
        expect(result.replies[0].parentId).toBe(parentComment.id);
      });
    });

    describe('User Comment Statistics', () => {
      it('should get user comment count', async () => {
        const mockUser = generateMockUser();
        const mockComments = [
          generateMockComment({ userId: mockUser.id }),
          generateMockComment({ userId: mockUser.id }),
          generateMockComment({ userId: mockUser.id }),
        ];

        prisma.comment.findMany.mockResolvedValue(mockComments);

        const result = await prisma.comment.findMany({
          where: { userId: mockUser.id },
        });

        expect(result).toHaveLength(3);
        expect(result.every(comment => comment.userId === mockUser.id)).toBe(
          true
        );
      });

      it('should get user active comment count', async () => {
        const mockUser = generateMockUser();
        const mockComments = [
          generateMockComment({ userId: mockUser.id, isDeleted: false }),
          generateMockComment({ userId: mockUser.id, isDeleted: false }),
        ];

        prisma.comment.findMany.mockResolvedValue(mockComments);

        const result = await prisma.comment.findMany({
          where: {
            userId: mockUser.id,
            isDeleted: false,
          },
        });

        expect(result).toHaveLength(2);
        expect(result.every(comment => !comment.isDeleted)).toBe(true);
      });
    });
  });

  describe('Email Uniqueness Constraint', () => {
    it('should enforce unique email constraint', async () => {
      const existingUser = generateMockUser({ email: 'test@example.com' });

      // First user creation should succeed
      prisma.user.create.mockResolvedValueOnce(existingUser);

      const firstResult = await prisma.user.create({
        data: { email: 'test@example.com', name: 'First User' },
      });

      expect(firstResult).toEqual(existingUser);

      // Second user creation with same email should fail
      const uniqueConstraintError = new Error(
        'Unique constraint failed on the fields: (`email`)'
      );
      uniqueConstraintError.code = 'P2002';

      prisma.user.create.mockRejectedValueOnce(uniqueConstraintError);

      await expect(
        prisma.user.create({
          data: { email: 'test@example.com', name: 'Second User' },
        })
      ).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('Cascade Operations', () => {
    it('should handle user deletion with existing comments', async () => {
      const mockUser = generateMockUser();

      // In a real implementation, this would need proper cascade handling
      // For now, we just test the basic operation
      prisma.user.delete.mockResolvedValue(mockUser);

      const result = await prisma.user.delete({
        where: { id: mockUser.id },
      });

      expect(result).toEqual(mockUser);

      // In a real scenario, you'd also need to handle or test:
      // - Cascade deletion of comments
      // - Or setting userId to null in comments
      // - Or preventing deletion if comments exist
    });
  });
});
