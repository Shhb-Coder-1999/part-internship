/**
 * Utils Index
 * Exports all utility functions from this directory
 */

import { createCommentQueryConditions, validateCommentText, validateCommentTextMiddleware, sanitizeCommentText, validateCommentId, validateCommentIdStrict, canModifyComment, canInteractWithComment, formatCommentForResponse } from './commentUtils.js';
import { createRateLimiter, createRedisRateLimiter, createMemoryRateLimiter } from './rateLimitUtils.js';

// Create a wrapper object that provides the expected API for tests
export const commentUtils = {
  // Text validation
  textValidation: validateCommentText,
  
  // Text sanitization
  sanitizeText: sanitizeCommentText,
  
  // ID validation
  validateId: validateCommentId,
  
  // Comment formatting
  formatComment: (comment) => {
    if (!comment) return null;
    
    // Exclude sensitive/internal fields
    const { isDeleted, internalId, ...commentData } = comment;
    
    return commentData;
  },
  
  // Pagination validation (placeholder - needs implementation)
  validatePagination: (params) => {
    const { page = 1, limit = 20 } = params;
    const errors = [];
    
    // Check if page is numeric and positive
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be greater than 0');
    }
    
    // Check if limit is numeric and within range
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be between 1 and 100');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      page: Math.max(1, pageNum || 1),
      limit: Math.min(100, Math.max(1, limitNum || 20))
    };
  },
  
  // Pagination calculation (placeholder - needs implementation)
  calculatePagination: (total, page = 1, limit = 10) => {
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    
    return {
      page: currentPage,
      totalPages,
      total,
      limit,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      offset: (currentPage - 1) * limit
    };
  },
  
  // Search comments (placeholder - needs implementation)
  searchComments: (comments, searchTerm) => {
    if (!searchTerm) return comments;
    
    const term = searchTerm.toLowerCase();
    return comments.filter(comment => 
      comment.text.toLowerCase().includes(term)
    );
  },
  
  // Sort comments (placeholder - needs implementation)
  sortComments: (comments, field = 'createdAt', order = 'desc') => {
    return [...comments].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  },
  
  // Filter comments (placeholder - needs implementation)
  filterComments: (comments, field, value) => {
    return comments.filter(comment => comment[field] === value);
  }
};

// Export validation utilities
export const commentValidation = {
  textValidation: validateCommentText,
  textValidationMiddleware: validateCommentTextMiddleware,
  sanitizeText: sanitizeCommentText,
  validateId: validateCommentId,
  validateIdStrict: validateCommentIdStrict,
  canModify: canModifyComment,
  canInteract: canInteractWithComment,
  formatComment: formatCommentForResponse
};

// Export individual functions as well
export { 
  createCommentQueryConditions, 
  validateCommentText, 
  validateCommentTextMiddleware,
  sanitizeCommentText, 
  validateCommentId, 
  validateCommentIdStrict,
  canModifyComment, 
  canInteractWithComment, 
  formatCommentForResponse 
} from './commentUtils.js';
export { createRateLimiter, createRedisRateLimiter, createMemoryRateLimiter, commentRateLimit } from './rateLimitUtils.js';
