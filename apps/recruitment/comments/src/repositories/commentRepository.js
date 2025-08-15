/**
 * Comment Repository
 * Handles all database operations using Prisma
 */

import { BaseRepository } from '../../../../../../packages/shared/repositories/index.js';
import { prisma } from '../clients/index.js';
import { DatabaseError, NotFoundError } from '../../../../../../packages/shared/utils/index.js';
import { LOG_CONTEXTS, PRISMA_ERROR_CODES, DB_CONFIG } from '../constants/index.js';
import {
  BusinessLogicError,
  ValidationError,
} from '../../../../../../packages/shared/utils/errors.js';

export class CommentRepository extends BaseRepository {
  constructor() {
    super(prisma, {
      modelName: 'comment',
      logContext: LOG_CONTEXTS.DATABASE,
      softDeleteField: DB_CONFIG.SOFT_DELETE_FIELD,
      timestampFields: DB_CONFIG.TIMESTAMP_FIELDS,
      defaultUserId: DB_CONFIG.DEFAULT_USER_ID,
    });
  }

  async getComments(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        parentId = null,
        includeDeleted = false,
        userId = null, // Filter by user for private data
        isPublic = false, // Flag for public vs private access
      } = options;
      
      const where = {};
      if (parentId !== null) where.parentId = parentId;
      if (!includeDeleted) where[DB_CONFIG.SOFT_DELETE_FIELD] = false;
      
      // User data isolation: only show user's own comments for private access
      if (!isPublic && userId) {
        where.userId = userId;
      }

      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        this.prisma.comment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'asc' },
          // Include user info for public comments but hide sensitive data
          select: {
            id: true,
            text: true,
            likes: true,
            dislikes: true,
            createdAt: true,
            updatedAt: true,
            parentId: true,
            userId: isPublic ? false : true, // Hide userId in public access
            deletedAt: true,
          }
        }),
        this.prisma.comment.count({ where }),
      ]);

      return {
        comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        meta: {
          isPublic,
          filteredByUser: !isPublic && !!userId
        }
      };
    } catch (error) {
      this.logger.error('Failed to retrieve comments', { options }, error);
      throw new DatabaseError(`Failed to retrieve comments: ${error.message}`, {
        options,
      });
    }
  }

  async getAllComments(parentId = null, includeDeleted = false, options = {}) {
    try {
      const { userId = null, isPublic = false } = options;
      
      const where = {};
      if (parentId) where.parentId = parentId;
      if (!includeDeleted) where[DB_CONFIG.SOFT_DELETE_FIELD] = false;
      
      // User data isolation: only show user's own comments for private access
      if (!isPublic && userId) {
        where.userId = userId;
      }
      
      return await this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          text: true,
          likes: true,
          dislikes: true,
          createdAt: true,
          updatedAt: true,
          parentId: true,
          userId: isPublic ? false : true, // Hide userId in public access
          deletedAt: true,
        }
      });
    } catch (error) {
      this.logger.error(
        'Failed to retrieve comments',
        { parentId, includeDeleted, options },
        error
      );
      throw new DatabaseError(`Failed to retrieve comments: ${error.message}`);
    }
  }

  async getCommentById(id) {
    try {
      return await this.prisma.comment.findUnique({ where: { id } });
    } catch (error) {
      this.logger.error(
        'Failed to retrieve comment by ID',
        { commentId: id },
        error
      );
      throw new DatabaseError(`Failed to retrieve comment: ${error.message}`, {
        commentId: id,
      });
    }
  }

  async createComment(commentData, userId) {
    let parentId = null;
    let text = '';
    try {
      const { text: commentText, parentId: commentParentId } = commentData;
      text = commentText;
      parentId = commentParentId;

      if (!text || typeof text !== 'string') {
        throw new ValidationError(
          'Comment text is required and must be a string'
        );
      }
      if (parentId && typeof parentId !== 'string') {
        throw new ValidationError('Parent ID must be a string');
      }

      return await this.prisma.comment.create({
        data: { text: text.trim(), userId, parentId: parentId || null },
      });
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      this.logger.error(
        'Failed to create comment',
        {
          text: typeof text === 'string' ? text.substring(0, 50) : 'invalid',
          parentId: parentId || null,
        },
        error
      );
      throw new DatabaseError(`Failed to create comment: ${error.message}`);
    }
  }

  async updateComment(id, updateData, userId) {
    try {
      const { text: newText } = updateData;
      if (!newText || typeof newText !== 'string') {
        throw new ValidationError(
          'Comment text is required and must be a string'
        );
      }

      const existingComment = await this.prisma.comment.findUnique({
        where: { id },
      });
      if (!existingComment)
        throw new NotFoundError(`Comment with ID '${id}' not found`, {
          commentId: id,
        });
      if (userId && existingComment.userId !== userId)
        throw new BusinessLogicError('Not authorized to update this comment', {
          commentId: id,
        });
      if (existingComment[DB_CONFIG.SOFT_DELETE_FIELD])
        throw new BusinessLogicError('Cannot update deleted comment', {
          commentId: id,
        });

      return await this.prisma.comment.update({
        where: { id },
        data: { text: newText.trim(), updatedAt: new Date() },
      });
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof BusinessLogicError
      )
        throw error;
      this.logger.error('Failed to update comment', { commentId: id }, error);
      throw new DatabaseError(`Failed to update comment: ${error.message}`, {
        commentId: id,
      });
    }
  }

  async deleteComment(id) {
    try {
      return await this.prisma.comment.update({
        where: { id },
        data: { [DB_CONFIG.SOFT_DELETE_FIELD]: true },
      });
    } catch (error) {
      if (error.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
        this.logger.warn('Comment not found for deletion', { commentId: id });
        throw new NotFoundError(`Comment with ID '${id}' not found`, {
          commentId: id,
        });
      }
      this.logger.error('Failed to delete comment', { commentId: id }, error);
      throw new DatabaseError(`Failed to delete comment: ${error.message}`, {
        commentId: id,
      });
    }
  }

  async getCommentStats() {
    try {
      const [totalComments, totalLikes, totalDislikes] = await Promise.all([
        this.prisma.comment.count({
          where: { [DB_CONFIG.SOFT_DELETE_FIELD]: false },
        }),
        this.prisma.comment.aggregate({
          where: { [DB_CONFIG.SOFT_DELETE_FIELD]: false },
          _sum: { likes: true },
        }),
        this.prisma.comment.aggregate({
          where: { [DB_CONFIG.SOFT_DELETE_FIELD]: false },
          _sum: { dislikes: true },
        }),
      ]);
      return {
        totalComments,
        totalLikes: totalLikes._sum.likes || 0,
        totalDislikes: totalDislikes._sum.dislikes || 0,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve comment statistics', error);
      throw new DatabaseError(
        `Failed to retrieve comment statistics: ${error.message}`
      );
    }
  }

  async likeComment(id, userId) {
    try {
      const comment = await this.prisma.comment.findUnique({ where: { id } });
      if (!comment)
        throw new NotFoundError(`Comment with ID '${id}' not found`, {
          commentId: id,
        });
      if (comment[DB_CONFIG.SOFT_DELETE_FIELD])
        throw new BusinessLogicError('Cannot like deleted comment', {
          commentId: id,
        });
      return await this.prisma.comment.update({
        where: { id },
        data: { likes: { increment: 1 } },
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError)
        throw error;
      this.logger.error(
        'Failed to like comment',
        { commentId: id, userId },
        error
      );
      throw new DatabaseError(`Failed to like comment: ${error.message}`, {
        commentId: id,
      });
    }
  }

  async dislikeComment(id, userId) {
    try {
      const comment = await this.prisma.comment.findUnique({ where: { id } });
      if (!comment)
        throw new NotFoundError(`Comment with ID '${id}' not found`, {
          commentId: id,
        });
      if (comment[DB_CONFIG.SOFT_DELETE_FIELD])
        throw new BusinessLogicError('Cannot dislike deleted comment', {
          commentId: id,
        });
      return await this.prisma.comment.update({
        where: { id },
        data: { dislikes: { increment: 1 } },
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError)
        throw error;
      this.logger.error(
        'Failed to dislike comment',
        { commentId: id, userId },
        error
      );
      throw new DatabaseError(`Failed to dislike comment: ${error.message}`, {
        commentId: id,
      });
    }
  }
}
