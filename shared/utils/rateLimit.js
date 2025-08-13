/**
 * Generic Rate Limiting Utilities
 * Reusable rate limiting logic across all apps
 */

import { createAppLogger } from './logger.js';

/**
 * Generic Rate Limiter Class
 * Manages rate limiting for any type of action
 */
export class RateLimiter {
  constructor(options = {}) {
    this.rateLimitMap = new Map();
    this.logger = createAppLogger(options.logContext || 'RateLimit');
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute default
    this.maxAttempts = options.maxAttempts || 5;
    this.actionName = options.actionName || 'action';
  }

  /**
   * Check if user can perform an action
   * @param {string} userIdentifier - User's IP address or ID
   * @returns {Object} Rate limit check result
   */
  canPerformAction(userIdentifier) {
    const now = Date.now();
    
    // Get user's action history
    const userHistory = this.rateLimitMap.get(userIdentifier) || [];

    // Remove old entries outside the time window
    const recentActions = userHistory.filter(
      (time) => now - time < this.windowMs,
    );

    const canPerform = recentActions.length < this.maxAttempts;
    const remainingAttempts = Math.max(0, this.maxAttempts - recentActions.length);
    const retryAfter = canPerform ? 0 : Math.ceil(this.windowMs / 1000);

    if (!canPerform) {
      this.logger.warn('Rate limit exceeded', {
        userIdentifier,
        actionCount: recentActions.length,
        maxAttempts: this.maxAttempts,
        windowMs: this.windowMs,
        actionName: this.actionName,
      });
    }

    return {
      canPerform,
      remainingAttempts,
      retryAfter,
      currentCount: recentActions.length,
      maxCount: this.maxAttempts,
    };
  }

  /**
   * Record an action attempt
   * @param {string} userIdentifier - User's IP address or ID
   */
  recordAction(userIdentifier) {
    const now = Date.now();
    const userHistory = this.rateLimitMap.get(userIdentifier) || [];
    userHistory.push(now);
    this.rateLimitMap.set(userIdentifier, userHistory);

    this.logger.debug('Action recorded', {
      userIdentifier,
      timestamp: now,
      actionName: this.actionName,
    });
  }

  /**
   * Clean up old rate limit data
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanup(maxAge = 5 * 60 * 1000) {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userIdentifier, userHistory] of this.rateLimitMap.entries()) {
      const recentHistory = userHistory.filter((time) => now - time < maxAge);
      
      if (recentHistory.length === 0) {
        this.rateLimitMap.delete(userIdentifier);
        cleanedCount++;
      } else if (recentHistory.length !== userHistory.length) {
        this.rateLimitMap.set(userIdentifier, recentHistory);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug('Rate limit cleanup completed', {
        cleanedEntries: cleanedCount,
        remainingEntries: this.rateLimitMap.size,
        actionName: this.actionName,
      });
    }
  }

  /**
   * Get rate limit statistics
   * @returns {Object} Rate limit statistics
   */
  getStats() {
    return {
      totalUsers: this.rateLimitMap.size,
      totalEntries: Array.from(this.rateLimitMap.values()).reduce(
        (sum, history) => sum + history.length,
        0,
      ),
      actionName: this.actionName,
    };
  }
}

/**
 * Create a rate limiter instance
 * @param {Object} options - Rate limiter options
 * @returns {RateLimiter} Rate limiter instance
 */
export const createRateLimiter = (options = {}) => new RateLimiter(options);

/**
 * Middleware factory for rate limiting
 * @param {RateLimiter} rateLimiter - Rate limiter instance
 * @param {string} identifierField - Field to use for user identification (default: 'ip')
 * @returns {Function} Express middleware function
 */
export const createRateLimitMiddleware = (rateLimiter, identifierField = 'ip') => {
  return (req, res, next) => {
    const userIdentifier = req[identifierField] || req.ip || req.connection.remoteAddress;
    const rateLimitCheck = rateLimiter.canPerformAction(userIdentifier);

    if (!rateLimitCheck.canPerform) {
      const error = new Error('Rate limit exceeded');
      error.statusCode = 429;
      error.details = {
        retryAfter: rateLimitCheck.retryAfter,
        limit: rateLimitCheck.maxCount,
        current: rateLimitCheck.currentCount,
        actionName: rateLimiter.actionName,
      };
      return next(error);
    }

    // Record the attempt
    rateLimiter.recordAction(userIdentifier);
    next();
  };
};

/**
 * Express middleware for rate limiting with automatic setup
 * @param {Object} options - Rate limiter options
 * @param {string} identifierField - Field to use for user identification
 * @returns {Function} Express middleware function
 */
export const rateLimitMiddleware = (options = {}, identifierField = 'ip') => {
  const rateLimiter = createRateLimiter(options);
  return createRateLimitMiddleware(rateLimiter, identifierField);
};
