import { BaseService } from '../../../../../packages/shared/services/index.js';
import { CommentRepository } from '../repositories/index.js';
import { API_MESSAGES, LOG_CONTEXTS } from '../constants/index.js';
import {
  ValidationError,
  NotFoundError,
  BusinessLogicError,
} from '../../../../../packages/shared/utils/index.js';

export class CommentService extends BaseService {
  constructor() {
    const db = new CommentRepository();
    super(db, {
      resourceName: 'Comment',
      logContext: LOG_CONTEXTS.SERVICE,
      requiredFields: ['text'],
    });
  }

  async getAllComments(options = {}, userContext = null) {
    // Determine if this is a public or private request
    const isPublic = !userContext || !userContext.id;
    const userId = userContext ? userContext.id : null;
    
    return await this.dbService.getComments({
      ...options,
      userId,
      isPublic
    });
  }

  async getComments(options = {}, userContext = null) {
    // Alias for getAllComments for backward compatibility
    return this.getAllComments(options, userContext);
  }

  async createComment({ text, parentId }, userContext = null) {
    if (!userContext || !userContext.id) {
      throw new ValidationError('User context required to create comments');
    }

    const newComment = await this.dbService.createComment(
      { text, parentId },
      userContext.id
    );
    return newComment;
  }

  async updateComment(id, { text }, userContext = null) {
    if (!userContext || !userContext.id) {
      throw new ValidationError('User context required to update comments');
    }

    const updated = await this.dbService.updateComment(
      id, 
      { text }, 
      userContext.id
    );
    return updated;
  }

  async deleteComment(id, userContext = null) {
    // Check if user owns the comment or is admin
    if (userContext && userContext.id) {
      const comment = await this.dbService.getCommentById(id);
      if (!comment) {
        throw new NotFoundError('Comment not found');
      }
      
      const isOwner = comment.userId === userContext.id;
      const isAdmin = userContext.roles && userContext.roles.includes('admin');
      
      if (!isOwner && !isAdmin) {
        throw new BusinessLogicError('Not authorized to delete this comment');
      }
    }
    
    return await this.dbService.deleteComment(id);
  }

  async getCommentById(id, userContext = null) {
    const comment = await this.dbService.getCommentById(id);
    if (!comment) {
      throw new NotFoundError(
        API_MESSAGES.ERROR?.COMMENT_NOT_FOUND || 'Comment not found'
      );
    }

    // Check ownership for private access
    if (userContext && userContext.id) {
      const isOwner = comment.userId === userContext.id;
      const isAdmin = userContext.roles && userContext.roles.includes('admin');
      const isPublicView = !userContext.id;
      
      if (!isOwner && !isAdmin && !isPublicView) {
        throw new BusinessLogicError('Not authorized to view this comment');
      }
    }

    return comment;
  }

  async getCommentStats() {
    return await this.dbService.getCommentStats();
  }

  async likeComment(id, userContext = null) {
    const userId = userContext ? userContext.id : null;
    return await this.dbService.likeComment(id, userId);
  }

  async dislikeComment(id, userContext = null) {
    const userId = userContext ? userContext.id : null;
    return await this.dbService.dislikeComment(id, userId);
  }
}
