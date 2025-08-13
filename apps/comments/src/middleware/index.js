/**
 * Middleware Index
 * Exports all middleware functions from this directory
 */

import { 
  validateCreateComment, 
  validateUpdateComment, 
  validateCommentId,
  validatePagination,
  sanitizeTextMiddleware,
  commentRateLimit
} from './commentValidation.js';

// Create wrapper object that provides the expected API for tests
export const commentValidation = {
  validateCreateComment,
  validateUpdateComment,
  validateCommentId,
  validatePagination,
  sanitizeTextMiddleware,
  commentRateLimit,
  // Aliases for backward compatibility
  validateCommentCreation: validateCreateComment,
  validateCommentUpdate: validateUpdateComment
};

// Export individual functions as well
export { 
  validateCreateComment, 
  validateUpdateComment, 
  validateCommentId,
  validatePagination,
  sanitizeTextMiddleware,
  commentRateLimit
} from './commentValidation.js';
