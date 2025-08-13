/**
 * Comment Service
 * Contains business logic for comment operations
 */

import { BaseService } from '@shared/services';
import { DatabaseService } from './databaseService.js';
import { ValidationError, NotFoundError, BusinessLogicError } from '@shared/utils';
import { LOG_CONTEXTS, API_MESSAGES } from '@constants';

export class CommentService extends BaseService {
  constructor() {
    const dbService = new DatabaseService();
    super(dbService, {
      resourceName: 'Comment',
      logContext: LOG_CONTEXTS.SERVICE,
      requiredFields: ['text'],
      validationRules: {
        text: {
          required: true,
          minLength: 1,
          maxLength: 250
        }
      }
    });
  }

  /**
   * Get all comments with optional filtering
   */
  async getAllComments(parentId = null, includeDeleted = false) {
    return await this.dbService.getAllComments(parentId, includeDeleted);
  }

  /**
   * Get comments with pagination and filtering
   */
  async getComments(options = {}) {
    return await this.dbService.getComments(options);
  }

  /**
   * Create a new comment
   */
  async createComment(text, parentId = null) {
    try {
      // Validate input using base service validation
      const validation = this.validateData({ text });
      if (!validation.isValid) {
        this.logger.warn('Comment validation failed', { 
          text: text?.substring(0, 50), 
          errors: validation.errors 
        });
        throw new ValidationError(API_MESSAGES.ERROR.VALIDATION_FAILED, validation.errors);
      }

      // Validate parent comment if provided
      if (parentId) {
        const parentComment = await this.dbService.getCommentById(parentId);
        if (!parentComment) {
          this.logger.warn('Parent comment not found', { parentId });
          throw new NotFoundError(API_MESSAGES.ERROR.PARENT_COMMENT_NOT_FOUND, { parentId });
        }
        if (parentComment.isDeleted) {
          this.logger.warn('Attempted to reply to deleted comment', { parentId });
          throw new BusinessLogicError(API_MESSAGES.ERROR.CANNOT_REPLY_TO_DELETED, { parentId });
        }
      }

      // Create comment using base service
      const commentData = { text, parentId };
      const newComment = await this.createRecord(commentData);
      
      this.logger.info(API_MESSAGES.SUCCESS.COMMENT_CREATED, { 
        commentId: newComment.id, 
        parentId, 
        textLength: text.length 
      });
      
      return newComment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async updateComment(id, newText) {
    try {
      // Validate input using base service validation
      const validation = this.validateData({ text: newText });
      if (!validation.isValid) {
        this.logger.warn('Comment update validation failed', { 
          commentId: id, 
          text: newText?.substring(0, 50), 
          errors: validation.errors 
        });
        throw new ValidationError(API_MESSAGES.ERROR.VALIDATION_FAILED, validation.errors);
      }

      // Update comment using base service
      const updatedComment = await this.updateRecord(id, { text: newText });
      return updatedComment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(id) {
    try {
      // Delete comment using base service
      const result = await this.deleteRecord(id);
      this.logger.info(API_MESSAGES.SUCCESS.COMMENT_DELETED, { commentId: id });
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get comment by ID
   */
  async getCommentById(id) {
    try {
      const comment = await this.dbService.getCommentById(id);
      if (!comment) {
        this.logger.warn('Comment not found by ID', { commentId: id });
        throw new NotFoundError(API_MESSAGES.ERROR.COMMENT_NOT_FOUND, { commentId: id });
      }
      return comment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get comment statistics
   */
  async getCommentStats() {
    return await this.dbService.getCommentStats({ isDeleted: false });
  }

  /**
   * Like a comment
   */
  async likeComment(id, userId) {
    try {
      const existingComment = await this.dbService.getCommentById(id);
      
      if (!existingComment) {
        throw new NotFoundError(API_MESSAGES.ERROR.COMMENT_NOT_FOUND, { commentId: id });
      }
      
      if (existingComment.isDeleted) {
        throw new BusinessLogicError(API_MESSAGES.ERROR.CANNOT_LIKE_DELETED, { commentId: id });
      }

      const updatedComment = await this.dbService.likeComment(id, userId);
      
      this.logger.info('Comment liked successfully', { commentId: id, userId });
      return updatedComment;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      this.logger.error('Error liking comment', { commentId: id, userId }, error);
      throw error;
    }
  }

  /**
   * Dislike a comment
   */
  async dislikeComment(id, userId) {
    try {
      const existingComment = await this.dbService.getCommentById(id);
      
      if (!existingComment) {
        throw new NotFoundError(API_MESSAGES.ERROR.COMMENT_NOT_FOUND, { commentId: id });
      }
      
      if (existingComment.isDeleted) {
        throw new BusinessLogicError(API_MESSAGES.ERROR.CANNOT_DISLIKE_DELETED, { commentId: id });
      }

      const updatedComment = await this.dbService.dislikeComment(id, userId);
      
      this.logger.info('Comment disliked successfully', { commentId: id, userId });
      return updatedComment;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      this.logger.error('Error disliking comment', { commentId: id, userId }, error);
      throw error;
    }
  }

  /**
   * Search comments by text
   */
  async searchComments(searchTerm, page = 1, limit = 20) {
    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new ValidationError('Search term is required and must be a string');
      }

      const result = await this.dbService.searchComments(searchTerm, page, limit);
      
      this.logger.info('Comments searched successfully', { 
        searchTerm, 
        page, 
        limit, 
        count: result.comments.length 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Error searching comments', { searchTerm, page, limit }, error);
      throw error;
    }
  }

  /**
   * Get replies for a comment
   */
  async getReplies(commentId) {
    try {
      if (!commentId || typeof commentId !== 'string') {
        throw new ValidationError('Comment ID is required and must be a string');
      }

      const replies = await this.dbService.getReplies(commentId);
      
      this.logger.info('Replies retrieved successfully', { 
        commentId, 
        count: replies.length 
      });
      
      return replies;
    } catch (error) {
      this.logger.error('Error retrieving replies', { commentId }, error);
      throw error;
    }
  }
}
