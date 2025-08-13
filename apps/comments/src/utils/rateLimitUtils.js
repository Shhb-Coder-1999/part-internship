/**
 * Rate Limiting Utilities for Comments
 * Uses shared rate limiting functionality
 */

import { rateLimitMiddleware } from '@shared/utils';
import { VALIDATION_RULES, LOG_CONTEXTS } from '@constants';

/**
 * Create a rate limiter for comment creation
 * @returns {Function} Express middleware function
 */
export const createRateLimiter = () => {
  return rateLimitMiddleware({
    windowMs: VALIDATION_RULES.RATE_LIMIT.WINDOW_MS,
    maxAttempts: VALIDATION_RULES.RATE_LIMIT.MAX_COMMENTS,
    actionName: 'comment_creation',
    logContext: LOG_CONTEXTS.RATE_LIMIT
  });
};

/**
 * Create a Redis-based rate limiter (placeholder implementation)
 * @returns {Function} Express middleware function
 */
export const createRedisRateLimiter = () => {
  return rateLimitMiddleware({
    windowMs: VALIDATION_RULES.RATE_LIMIT.WINDOW_MS,
    maxAttempts: VALIDATION_RULES.RATE_LIMIT.MAX_COMMENTS,
    actionName: 'comment_creation',
    logContext: LOG_CONTEXTS.RATE_LIMIT
  });
};

/**
 * Create a memory-based rate limiter (placeholder implementation)
 * @returns {Function} Express middleware function
 */
export const createMemoryRateLimiter = () => {
  return rateLimitMiddleware({
    windowMs: VALIDATION_RULES.RATE_LIMIT.WINDOW_MS,
    maxAttempts: VALIDATION_RULES.RATE_LIMIT.MAX_COMMENTS,
    actionName: 'comment_creation',
    logContext: LOG_CONTEXTS.RATE_LIMIT
  });
};

/**
 * Comment rate limit middleware
 * @param {Function} rateLimiter - Rate limiter function
 * @returns {Function} Express middleware function
 */
export const commentRateLimit = (rateLimiter) => rateLimiter;
