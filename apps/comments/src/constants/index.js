/**
 * Comment App Constants
 * Extends shared constants with comment-specific configurations
 */

import { 
  HTTP_STATUS, 
  VALIDATION_RULES as SHARED_VALIDATION_RULES,
  DB_CONFIG as SHARED_DB_CONFIG,
  API_MESSAGES as SHARED_API_MESSAGES,
  LOG_CONTEXTS as SHARED_LOG_CONTEXTS,
  PRISMA_ERROR_CODES,
  DEFAULTS as SHARED_DEFAULTS
} from '@shared/constants';

// Re-export shared constants
export { HTTP_STATUS, PRISMA_ERROR_CODES };

// Comment-specific validation rules
export const VALIDATION_RULES = {
  ...SHARED_VALIDATION_RULES,
  COMMENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 250,
    REQUIRED_FIELDS: ['text'],
  },
  MIDDLEWARE: {
    COMMENT: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 1000,
    },
  },
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_COMMENTS: 5,
  },
};

// Comment-specific database configuration
export const DB_CONFIG = {
  ...SHARED_DB_CONFIG,
  DEFAULT_USER_ID: 'default-user-id',
};

// Comment-specific API messages
export const API_MESSAGES = {
  SUCCESS: {
    ...SHARED_API_MESSAGES.SUCCESS,
    COMMENTS_RETRIEVED: 'Comments retrieved successfully',
    COMMENT_CREATED: 'Comment created successfully',
    COMMENT_UPDATED: 'Comment updated successfully',
    COMMENT_DELETED: 'Comment deleted successfully',
    COMMENT_LIKED: 'Comment liked successfully',
    COMMENT_DISLIKED: 'Comment disliked successfully',
  },
  ERROR: {
    ...SHARED_API_MESSAGES.ERROR,
    COMMENT_NOT_FOUND: 'Comment not found',
    PARENT_COMMENT_NOT_FOUND: 'Parent comment not found',
    CANNOT_REPLY_TO_DELETED: 'Cannot reply to a deleted comment',
    COMMENT_ALREADY_DELETED: 'Comment is already deleted',
    CANNOT_UPDATE_DELETED: 'Comment is deleted and cannot be updated',
    CANNOT_LIKE_DELETED: 'Cannot like a deleted comment',
    CANNOT_DISLIKE_DELETED: 'Cannot dislike a deleted comment',
    RATE_LIMIT_EXCEEDED: 'Too many comments. Please wait before posting again.',
  },
};

// Comment-specific logging contexts
export const LOG_CONTEXTS = {
  ...SHARED_LOG_CONTEXTS,
  SERVICE: 'CommentsAPI',
  CONTROLLER: 'CommentsController',
  DATABASE: 'CommentsDB',
  VALIDATION: 'CommentValidation',
  RATE_LIMIT: 'CommentRateLimit',
};

// Comment-specific defaults
export const DEFAULTS = {
  ...SHARED_DEFAULTS,
  SEARCH_LIMIT: 10,
};
