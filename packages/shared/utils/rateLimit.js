/**
 * Rate Limiting Utility
 * Basic rate limiting middleware for services
 */

import { createAppLogger } from './logger.js';

const logger = createAppLogger('RateLimit');

/**
 * Simple in-memory rate limiter
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
export const rateLimitMiddleware = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxAttempts = 100,
    actionName = 'request',
    logContext = 'RateLimit'
  } = options;

  const requests = new Map();
  const logger = createAppLogger(logContext);

  return (req, res, next) => {
    const identifier = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(identifier)) {
      const userRequests = requests.get(identifier).filter(time => time > windowStart);
      requests.set(identifier, userRequests);
    }

    const userRequests = requests.get(identifier) || [];
    
    if (userRequests.length >= maxAttempts) {
      logger.warn(`Rate limit exceeded for ${actionName}`, {
        identifier,
        attempts: userRequests.length,
        maxAttempts,
        windowMs
      });

      return res.status(429).json({
        status: 'error',
        message: `Too many ${actionName} attempts`,
        retryAfter: Math.ceil(windowMs / 1000),
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    userRequests.push(now);
    requests.set(identifier, userRequests);
    
    logger.debug(`Rate limit check passed for ${actionName}`, {
      identifier,
      attempts: userRequests.length,
      maxAttempts
    });

    next();
  };
};

export default rateLimitMiddleware;
