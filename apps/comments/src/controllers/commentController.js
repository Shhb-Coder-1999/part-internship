/**
 * Comment Controller
 * Handles HTTP requests and responses for comment operations
 */

import { BaseController } from '@shared/controllers';
import { CommentService } from '@services';
import { HTTP_STATUS, API_MESSAGES, LOG_CONTEXTS } from '@constants';

export class CommentController extends BaseController {
  constructor() {
    const commentService = new CommentService();
    super(commentService, {
      resourceName: 'Comment',
      logContext: LOG_CONTEXTS.CONTROLLER,
      successMessages: {
        retrieved: API_MESSAGES.SUCCESS.COMMENTS_RETRIEVED,
        created: API_MESSAGES.SUCCESS.COMMENT_CREATED,
        updated: API_MESSAGES.SUCCESS.COMMENT_UPDATED,
        deleted: API_MESSAGES.SUCCESS.COMMENT_DELETED,
        search: 'Comment search completed successfully',
        stats: 'Comment statistics retrieved successfully'
      }
    });
  }

  /**
   * Get all comments with pagination
   */
  async getAllComments(req, res) {
    return this.getAllRecords(req, res, 'getAllComments');
  }

  /**
   * Get comments with pagination and filtering
   */
  async getComments(req, res) {
    return this.getAllRecords(req, res, 'getComments');
  }

  /**
   * Create a new comment
   */
  async createComment(req, res) {
    return this.createRecord(req, res, 'createComment');
  }

  /**
   * Update a comment
   */
  async updateComment(req, res) {
    return this.updateRecord(req, res, 'updateComment');
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(req, res) {
    return this.deleteRecord(req, res, 'deleteComment');
  }

  /**
   * Get comment by ID
   */
  async getCommentById(req, res) {
    return this.getRecordById(req, res, 'getCommentById');
  }

  /**
   * Search comments
   */
  async searchComments(req, res) {
    return this.searchRecords(req, res, 'searchComments');
  }

  /**
   * Get comment statistics
   */
  async getCommentStats(req, res) {
    return this.getStats(req, res, 'getCommentStats');
  }

  /**
   * Like a comment
   */
  async likeComment(req, res) {
    try {
      const { id } = req.params;
      const { likes, dislikes } = await this.service.likeComment(id);
      
      this.logger.info(API_MESSAGES.SUCCESS.COMMENT_LIKED, { commentId: id, likes, dislikes });
      
      return res.status(HTTP_STATUS.OK).json(
        this.successResponse({ id, likes, dislikes }, API_MESSAGES.SUCCESS.COMMENT_LIKED)
      );
    } catch (error) {
      this.logger.error('Failed to like comment', { commentId: req.params.id }, error);
      throw error;
    }
  }

  /**
   * Dislike a comment
   */
  async dislikeComment(req, res) {
    try {
      const { id } = req.params;
      const { likes, dislikes } = await this.service.dislikeComment(id);
      
      this.logger.info(API_MESSAGES.SUCCESS.COMMENT_DISLIKED, { commentId: id, likes, dislikes });
      
      return res.status(HTTP_STATUS.OK).json(
        this.successResponse({ id, likes, dislikes }, API_MESSAGES.SUCCESS.COMMENT_DISLIKED)
      );
    } catch (error) {
      this.logger.error('Failed to dislike comment', { commentId: req.params.id }, error);
      throw error;
    }
  }

  /**
   * Helper method for success response
   */
  successResponse(data, message) {
    return {
      success: true,
      data,
      message
    };
  }
}
