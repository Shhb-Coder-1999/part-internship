/**
 * Comment App Constants
 */

export {
  HTTP_STATUS,
  PRISMA_ERROR_CODES,
} from '@shared/core/constants';

export const VALIDATION_RULES = {
  COMMENT: { MIN_LENGTH: 1, MAX_LENGTH: 1000, REQUIRED_FIELDS: ['text'] },
  RATE_LIMIT: { WINDOW_MS: 60 * 1000, MAX_COMMENTS: 5 },
};

export const DB_CONFIG = {
  SOFT_DELETE_FIELD: 'isDeleted',
  TIMESTAMP_FIELDS: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  DEFAULT_USER_ID: 'default-user-id',
};

export const API_MESSAGES = {
  SUCCESS: {
    COMMENTS_RETRIEVED: 'Comments retrieved successfully',
    COMMENT_CREATED: 'Comment created successfully',
    COMMENT_UPDATED: 'Comment updated successfully',
    COMMENT_DELETED: 'Comment deleted successfully',
    COMMENT_LIKED: 'Comment liked successfully',
    COMMENT_DISLIKED: 'Comment disliked successfully',
  },
  ERROR: {
    COMMENT_NOT_FOUND: 'Comment not found',
  },
};

export const LOG_CONTEXTS = {
  SERVICE: 'CommentsAPI',
  CONTROLLER: 'CommentsController',
  DATABASE: 'CommentsDB',
  VALIDATION: 'CommentValidation',
  RATE_LIMIT: 'CommentRateLimit',
};

export const DEFAULTS = { 
  SEARCH_LIMIT: 10,
  PORT: 3001,
  HOST: 'localhost'
};

export const ENV_VARS = {
  PORT: 'PORT',
  HOST: 'HOST',
  NODE_ENV: 'NODE_ENV',
  DATABASE_URL: 'DATABASE_URL'
};
