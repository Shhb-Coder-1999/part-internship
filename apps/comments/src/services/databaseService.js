/**
 * Database Service
 * Handles all database operations using Prisma
 */

import { BaseDatabaseService } from '@shared/services';
import { PrismaClient } from '@prisma/client';
import { DatabaseError, NotFoundError } from '@shared/utils';
import { LOG_CONTEXTS, PRISMA_ERROR_CODES, DB_CONFIG, DEFAULTS } from '@constants';
import { BusinessLogicError } from '@shared/utils/errors';
import { ValidationError } from '@shared/utils/errors';

export class DatabaseService extends BaseDatabaseService {
  constructor() {
    const prismaClient = new PrismaClient();
    super(prismaClient, {
      modelName: 'comment',
      logContext: LOG_CONTEXTS.DATABASE,
      softDeleteField: DB_CONFIG.SOFT_DELETE_FIELD,
      timestampFields: DB_CONFIG.TIMESTAMP_FIELDS,
      defaultUserId: DB_CONFIG.DEFAULT_USER_ID
    });
  }

  /**
   * Get all comments with pagination and filtering
   */
  async getComments(options = {}) {
    try {
      const { page = 1, limit = 20, parentId = null, includeDeleted = false } = options;
      
      const where = {};
      if (parentId !== null) {
        where.parentId = parentId;
      }
      if (!includeDeleted) {
        where.isDeleted = false;
      }

      const skip = (page - 1) * limit;
      
      const [comments, total] = await Promise.all([
        this.prisma.comment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: true,
            replies: {
              where: { isDeleted: false },
              include: { user: true }
            }
          }
        }),
        this.prisma.comment.count({ where })
      ]);

      return {
        comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Failed to retrieve comments', { options }, error);
      throw new DatabaseError(`Failed to retrieve comments: ${error.message}`, { options });
    }
  }

  /**
   * Get all comments with optional filtering
   */
  async getAllComments(parentId = null, includeDeleted = false) {
    try {
      const where = {};
      
      if (parentId) {
        where.parentId = parentId;
      }
      
      if (!includeDeleted) {
        where[this.softDeleteField] = false;
      }

      const comments = await this.prisma.comment.findMany({
        where,
        include: {
          replies: {
            where: { [this.softDeleteField]: false },
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      this.logger.debug('Comments retrieved successfully', { 
        count: comments.length, 
        parentId, 
        includeDeleted 
      });
      
      return comments;
    } catch (error) {
      this.logger.error('Failed to retrieve comments', { parentId, includeDeleted }, error);
      throw new DatabaseError(`Failed to retrieve comments: ${error.message}`);
    }
  }

  /**
   * Get comment by ID
   */
  async getCommentById(id) {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id },
        include: {
          replies: {
            where: { [this.softDeleteField]: false },
            select: { id: true }
          }
        }
      });

      return comment;
    } catch (error) {
      this.logger.error('Failed to retrieve comment by ID', { commentId: id }, error);
      throw new DatabaseError(`Failed to retrieve comment: ${error.message}`, { commentId: id });
    }
  }

  /**
   * Create a new comment
   */
  async createComment(commentData, userId) {
    let parentId = null;
    let text = '';
    try {
      const { text: commentText, parentId: commentParentId } = commentData;
      text = commentText;
      parentId = commentParentId;
      
      // Validate required fields
      if (!text || typeof text !== 'string') {
        throw new ValidationError('Comment text is required and must be a string');
      }

      if (parentId && typeof parentId !== 'string') {
        throw new ValidationError('Parent ID must be a string');
      }

      const newComment = await this.prisma.comment.create({
        data: {
          text: text.trim(),
          userId,
          parentId: parentId || null
        },
        include: {
          user: true,
          replies: {
            where: { isDeleted: false },
            select: { id: true }
          }
        }
      });

      this.logger.info('Comment created successfully', { 
        commentId: newComment.id, 
        userId,
        textLength: text.length,
        parentId 
      });

      return newComment;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.logger.error('Failed to create comment', { 
        text: typeof text === 'string' ? text.substring(0, 50) : 'invalid', 
        parentId: parentId || null
      }, error);
      throw new DatabaseError(`Failed to create comment: ${error.message}`, { 
        text: typeof text === 'string' ? text.substring(0, 50) : 'invalid', 
        parentId: parentId || null 
      });
    }
  }

  /**
   * Update a comment
   */
  async updateComment(id, updateData, userId) {
    try {
      const { text: newText } = updateData;
      
      // Validate required fields
      if (!newText || typeof newText !== 'string') {
        throw new ValidationError('Comment text is required and must be a string');
      }

      // Check if comment exists and user can modify it
      const existingComment = await this.prisma.comment.findUnique({
        where: { id }
      });

      if (!existingComment) {
        throw new NotFoundError(`Comment with ID '${id}' not found`, { commentId: id });
      }

      if (existingComment.userId !== userId) {
        throw new BusinessLogicError('Not authorized to update this comment', { commentId: id });
      }

      if (existingComment.isDeleted) {
        throw new BusinessLogicError('Cannot update deleted comment', { commentId: id });
      }

      const updatedComment = await this.prisma.comment.update({
        where: { id },
        data: {
          text: newText.trim(),
          updatedAt: new Date()
        },
        include: {
          user: true,
          replies: {
            where: { isDeleted: false },
            select: { id: true }
          }
        }
      });

      this.logger.info('Comment updated successfully', { 
        commentId: id, 
        userId,
        textLength: newText.length
      });

      return updatedComment;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      this.logger.error('Failed to update comment', { 
        commentId: id, 
        newText: typeof newText === 'string' ? newText.substring(0, 50) : 'invalid' 
      }, error);
      throw new DatabaseError(`Failed to update comment: ${error.message}`, { commentId: id });
    }
  }

  /**
   * Soft delete a comment
   */
  async deleteComment(id) {
    try {
      const deletedComment = await this.prisma.comment.update({
        where: { id },
        data: { [this.softDeleteField]: true },
        include: {
          replies: {
            select: { id: true }
          }
        }
      });

      return deletedComment;
    } catch (error) {
      if (error.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
        this.logger.warn('Comment not found for deletion', { commentId: id });
        throw new NotFoundError(`Comment with ID '${id}' not found`, { commentId: id });
      }
      this.logger.error('Failed to delete comment', { commentId: id }, error);
      throw new DatabaseError(`Failed to delete comment: ${error.message}`, { commentId: id });
    }
  }

  /**
   * Get comment statistics
   */
  async getCommentStats() {
    try {
      const [totalComments, totalLikes, totalDislikes] = await Promise.all([
        this.prisma.comment.count({ where: { isDeleted: false } }),
        this.prisma.comment.aggregate({
          where: { isDeleted: false },
          _sum: { likes: true }
        }),
        this.prisma.comment.aggregate({
          where: { isDeleted: false },
          _sum: { dislikes: true }
        })
      ]);

      return {
        totalComments,
        totalLikes: totalLikes._sum.likes || 0,
        totalDislikes: totalDislikes._sum.dislikes || 0
      };
    } catch (error) {
      this.logger.error('Failed to retrieve comment statistics', error);
      throw new DatabaseError(`Failed to retrieve comment statistics: ${error.message}`);
    }
  }

  /**
   * Like a comment
   */
  async likeComment(id, userId) {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!comment) {
        throw new NotFoundError(`Comment with ID '${id}' not found`, { commentId: id });
      }

      if (comment.isDeleted) {
        throw new BusinessLogicError('Cannot like deleted comment', { commentId: id });
      }

      const updatedComment = await this.prisma.comment.update({
        where: { id },
        data: { likes: { increment: 1 } },
        include: { user: true }
      });

      this.logger.info('Comment liked successfully', { commentId: id, userId });
      return updatedComment;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      this.logger.error('Failed to like comment', { commentId: id, userId }, error);
      throw new DatabaseError(`Failed to like comment: ${error.message}`, { commentId: id });
    }
  }

  /**
   * Dislike a comment
   */
  async dislikeComment(id, userId) {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!comment) {
        throw new NotFoundError(`Comment with ID '${id}' not found`, { commentId: id });
      }

      if (comment.isDeleted) {
        throw new BusinessLogicError('Cannot dislike deleted comment', { commentId: id });
      }

      const updatedComment = await this.prisma.comment.update({
        where: { id },
        data: { dislikes: { increment: 1 } },
        include: { user: true }
      });

      this.logger.info('Comment disliked successfully', { commentId: id, userId });
      return updatedComment;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      this.logger.error('Failed to dislike comment', { commentId: id, userId }, error);
      throw new DatabaseError(`Failed to dislike comment: ${error.message}`, { commentId: id });
    }
  }

  /**
   * Search comments by text
   */
  async searchComments(searchTerm, page = 1, limit = 20) {
    try {
      const where = {
        isDeleted: false,
        text: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      };

      const skip = (page - 1) * limit;
      
      const [comments, total] = await Promise.all([
        this.prisma.comment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: true,
            replies: {
              where: { isDeleted: false },
              select: { id: true }
            }
          }
        }),
        this.prisma.comment.count({ where })
      ]);

      return {
        comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Failed to search comments', { searchTerm, page, limit }, error);
      throw new DatabaseError(`Failed to search comments: ${error.message}`, { searchTerm });
    }
  }

  /**
   * Get replies for a comment
   */
  async getReplies(commentId) {
    try {
      const replies = await this.prisma.comment.findMany({
        where: {
          parentId: commentId,
          isDeleted: false
        },
        include: {
          user: true,
          replies: {
            where: { isDeleted: false },
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      this.logger.debug('Replies retrieved successfully', { 
        commentId, 
        count: replies.length 
      });
      
      return replies;
    } catch (error) {
      this.logger.error('Failed to retrieve replies', { commentId }, error);
      throw new DatabaseError(`Failed to retrieve replies: ${error.message}`, { commentId });
    }
  }
}
