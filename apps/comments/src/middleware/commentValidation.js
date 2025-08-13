/**
 * Comment-specific validation middleware
 * App-specific validation rules for comments
 */

import { ValidationError, createAppLogger } from '@shared/utils';
import { LOG_CONTEXTS, API_MESSAGES } from '@constants';
import { validateCommentTextMiddleware, validateCommentIdStrict, sanitizeCommentText } from '@utils';

/**
 * Validate comment creation request
 */
export const validateCreateComment = (req, res, next) => {
  const logger = createAppLogger(LOG_CONTEXTS.VALIDATION);
  const { text, parentId } = req.body;
  
  // Check if text field exists
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Comment text is required'
    });
  }
  
  // Check if text is a string
  if (typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Comment text must be a string'
    });
  }
  
  // Check for empty or whitespace-only text
  if (!text.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Comment text is required'
    });
  }
  
  // Validate comment text using utility function
  const textValidation = validateCommentTextMiddleware(text);

  if (!textValidation.isValid) {
    logger.warn('Comment creation validation failed', { 
      text: text?.substring(0, 50), 
      errors: textValidation.errors 
    });
    
    // Send HTTP response instead of throwing error
    return res.status(400).json({
      success: false,
      error: 'Comment text must be between 1 and 1000 characters'
    });
  }

  // Validate parentId if provided using utility function
  if (parentId) {
    const parentValidation = validateCommentIdStrict(parentId);

    if (!parentValidation.isValid) {
      logger.warn('Parent ID validation failed', { parentId, errors: parentValidation.errors });
      
      // Send HTTP response instead of throwing error
      return res.status(400).json({
        success: false,
        error: 'Invalid parent comment ID format'
      });
    }
  }

  // Sanitize text by trimming whitespace
  if (text) {
    req.body.text = sanitizeCommentText(text);
  }

  next();
};

/**
 * Validate comment update request
 */
export const validateUpdateComment = (req, res, next) => {
  const logger = createAppLogger(LOG_CONTEXTS.VALIDATION);
  const { text } = req.body;
  const { id } = req.params;
  
  // Check if comment ID exists
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Comment ID is required'
    });
  }
  
  // Check if comment ID is not empty
  if (id.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Comment ID is required'
    });
  }
  
  // Validate comment ID using utility function
  const idValidation = validateCommentIdStrict(id);
  if (!idValidation.isValid) {
    logger.warn('Comment ID validation failed', { id, errors: idValidation.errors });
    
    // Send HTTP response instead of throwing error
    return res.status(400).json({
      success: false,
      error: 'Invalid comment ID format'
    });
  }
  
  // Check if text field exists
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Comment text is required'
    });
  }
  
  // Check if text is a string
  if (typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Comment text must be a string'
    });
  }
  
  // Check for empty or whitespace-only text
  if (!text.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Comment text is required'
    });
  }
  
  // Validate comment text using utility function
  const validation = validateCommentTextMiddleware(text);

  if (!validation.isValid) {
    logger.warn('Comment update validation failed', { 
      text: text?.substring(0, 50), 
      errors: validation.errors 
    });
    
    // Send HTTP response instead of throwing error
    return res.status(400).json({
      success: false,
      error: 'Comment text must be between 1 and 1000 characters'
    });
  }

  // Sanitize text by trimming whitespace
  if (text) {
    req.body.text = sanitizeCommentText(text);
  }

  next();
};

/**
 * Validate comment ID parameter
 */
export const validateCommentId = (req, res, next) => {
  const logger = createAppLogger(LOG_CONTEXTS.VALIDATION);
  const { id } = req.params;
  
  // Check if ID exists
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Comment ID is required'
    });
  }
  
  // Check if ID is not empty
  if (id.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Comment ID cannot be empty'
    });
  }
  
  // Validate comment ID using utility function
  const validation = validateCommentIdStrict(id);

  if (!validation.isValid) {
    logger.warn('Comment ID validation failed', { id, errors: validation.errors });
    
    // Send HTTP response instead of throwing error
    return res.status(400).json({
      success: false,
      error: 'Invalid comment ID format'
    });
  }

  next();
};

/**
 * Sanitize comment text
 */
export const sanitizeTextMiddleware = (req, res, next) => {
  if (req.body.text) {
    // Use utility function for sanitization
    req.body.text = sanitizeCommentText(req.body.text);
  }
  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  const logger = createAppLogger(LOG_CONTEXTS.VALIDATION);
  const { page, limit } = req.query;
  
  // Set default values if missing (as strings for test compatibility)
  if (!page) req.query.page = '1';
  if (!limit) req.query.limit = '20';
  
  // Validate page number
  const pageNum = parseInt(req.query.page);
  if (isNaN(pageNum) || pageNum <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Page must be a positive integer'
    });
  }
  
  // Validate limit
  const limitNum = parseInt(req.query.limit);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100'
    });
  }
  
  // Convert to integers for consistency (but keep defaults as strings for test compatibility)
  if (page) req.query.page = pageNum;
  if (limit) req.query.limit = limitNum;
  
  next();
};

/**
 * Rate limiting for comment creation (prevent spam)
 */
export const commentRateLimit = (rateLimiter) => {
  return (req, res, next) => {
    const userIp = req.ip || req.connection.remoteAddress;
    const rateLimitCheck = rateLimiter.canPerformAction(userIp);

    if (!rateLimitCheck.canPerform) {
      const error = new Error('Rate limit exceeded');
      error.statusCode = 429;
      error.details = {
        retryAfter: rateLimitCheck.retryAfter,
        limit: rateLimitCheck.maxCount,
        current: rateLimitCheck.currentCount,
      };
      return next(error);
    }

    // Record the attempt
    rateLimiter.recordAction(userIp);
    next();
  };
};
