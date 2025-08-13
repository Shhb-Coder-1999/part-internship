/**
 * Comment Utility Functions
 * Uses shared validation utilities for common operations
 */

import { validate, commonRules } from '@shared/utils';
import { VALIDATION_RULES, DB_CONFIG } from '@constants';

/**
 * Validate comment text according to business rules
 * @param {string} text - Comment text to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateCommentText = (text) => {
  const rules = [
    commonRules.required('text'),
    commonRules.minLength('text', VALIDATION_RULES.COMMENT.MIN_LENGTH),
    commonRules.maxLength('text', VALIDATION_RULES.COMMENT.MAX_LENGTH)
  ];

  return validate(text, rules);
};

/**
 * Validate comment text for middleware (stricter rules)
 * @param {string} text - Comment text to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateCommentTextMiddleware = (text) => {
  const rules = [
    commonRules.required('text'),
    commonRules.minLength('text', VALIDATION_RULES.MIDDLEWARE.COMMENT.MIN_LENGTH),
    commonRules.maxLength('text', VALIDATION_RULES.MIDDLEWARE.COMMENT.MAX_LENGTH)
  ];

  return validate(text, rules);
};

/**
 * Validate comment ID parameter (permissive - for backward compatibility)
 * @param {string} id - Comment ID to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateCommentId = (id) => {
  const rules = [
    commonRules.required('id'),
    commonRules.minLength('id', 1)
  ];

  return validate(id, rules);
};

/**
 * Validate comment ID parameter (strict - for middleware validation)
 * @param {string} id - Comment ID to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateCommentIdStrict = (id) => {
  const rules = [
    commonRules.required('id'),
    commonRules.minLength('id', 1)
  ];

  const validation = validate(id, rules);
  
  // Additional format validation: only allow alphanumeric, hyphens, and underscores
  if (validation.isValid && id) {
    const validIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validIdPattern.test(id)) {
      return {
        isValid: false,
        errors: ['Invalid comment ID format']
      };
    }
  }

  return validation;
};

/**
 * Sanitize comment text by removing HTML tags and trimming whitespace
 * @param {string} text - Raw comment text
 * @returns {string} Sanitized comment text
 */
export const sanitizeCommentText = (text) => {
  if (!text) return '';
  
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
};

/**
 * Check if a comment can be modified (exists and not deleted)
 * @param {Object} comment - Comment object to check
 * @returns {Object} Result with canModify and reason
 */
export const canModifyComment = (comment) => {
  if (!comment) {
    return {
      canModify: false,
      reason: 'Comment does not exist',
    };
  }

  if (comment[DB_CONFIG.SOFT_DELETE_FIELD]) {
    return {
      canModify: false,
      reason: 'Comment is deleted',
    };
  }

  return {
    canModify: true,
    reason: null,
  };
};

/**
 * Check if a comment can be interacted with (liked/disliked)
 * @param {Object} comment - Comment object to check
 * @returns {Object} Result with canInteract and reason
 */
export const canInteractWithComment = (comment) => {
  if (!comment) {
    return {
      canInteract: false,
      reason: 'Comment does not exist',
    };
  }

  if (comment[DB_CONFIG.SOFT_DELETE_FIELD]) {
    return {
      canInteract: false,
      reason: 'Comment is deleted',
    };
  }

  return {
    canInteract: true,
    reason: null,
  };
};

/**
 * Format comment data for API response
 * @param {Object} comment - Raw comment data from database
 * @returns {Object} Formatted comment data
 */
export const formatCommentForResponse = (comment) => {
  if (!comment) return null;

  const { [DB_CONFIG.SOFT_DELETE_FIELD]: isDeleted, ...commentData } = comment;

  return {
    ...commentData,
    isDeleted: Boolean(isDeleted),
  };
};

/**
 * Create database query conditions for comments
 * @param {Object} options - Query options
 * @returns {Object} Prisma where clause
 */
export const createCommentQueryConditions = ({
  parentId = null,
  includeDeleted = false,
  searchTerm = null,
  limit = null,
}) => {
  const where = {};

  if (parentId) {
    where.parentId = parentId;
  }

  if (!includeDeleted) {
    where[DB_CONFIG.SOFT_DELETE_FIELD] = false;
  }

  if (searchTerm) {
    where.text = {
      contains: searchTerm,
      mode: 'insensitive',
    };
  }

  return {
    where,
    ...(limit && { take: limit }),
    orderBy: { createdAt: 'desc' },
  };
};
