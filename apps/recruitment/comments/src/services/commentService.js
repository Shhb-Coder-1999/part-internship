import { BaseService } from '@app/shared/services/index.js';
import { CommentRepository } from '@app/repositories';
import { API_MESSAGES, LOG_CONTEXTS } from '@app/constants';
import {
  ValidationError,
  NotFoundError,
  BusinessLogicError,
} from '@app/shared/utils/index.js';

export class CommentService extends BaseService {
  constructor() {
    const db = new CommentRepository();
    super(db, {
      resourceName: 'Comment',
      logContext: LOG_CONTEXTS.SERVICE,
      requiredFields: ['text'],
    });
  }

  async getAllComments(options = {}) {
    return await this.dbService.getComments(options);
  }

  async createComment({ text, parentId }) {
    const newComment = await this.dbService.createComment(
      { text, parentId },
      undefined
    );
    return newComment;
  }

  async updateComment(id, { text }) {
    const updated = await this.dbService.updateComment(id, { text }, undefined);
    return updated;
  }

  async deleteComment(id) {
    return await this.dbService.deleteComment(id);
  }

  async getCommentById(id) {
    const comment = await this.dbService.getCommentById(id);
    if (!comment)
      throw new NotFoundError(
        API_MESSAGES.ERROR?.COMMENT_NOT_FOUND || 'Comment not found'
      );
    return comment;
  }

  async getCommentStats() {
    return await this.dbService.getCommentStats();
  }

  async likeComment(id) {
    return await this.dbService.likeComment(id);
  }

  async dislikeComment(id) {
    return await this.dbService.dislikeComment(id);
  }
}
