/**
 * Rate Limiting Middleware for Part Bank API
 */

import { ENV_VARS, DEFAULTS } from '#app/constants';

/**
 * Rate limiting configuration based on PRD requirements
 */
export const rateLimitConfig = {
  // General rate limit: 100 requests per 15 minutes
  general: {
    max: parseInt(process.env[ENV_VARS.RATE_LIMIT_MAX]) || DEFAULTS.RATE_LIMIT_MAX,
    timeWindow: parseInt(process.env[ENV_VARS.RATE_LIMIT_TIMEWINDOW]) || DEFAULTS.RATE_LIMIT_TIMEWINDOW,
    skipSuccessfulRequests: false,
    keyGenerator: (request) => {
      return request.user?.id || request.ip;
    }
  },

  // Strict rate limit for auth endpoints: 10 attempts per 15 minutes
  auth: {
    max: 10,
    timeWindow: 15 * 60 * 1000, // 15 minutes
    skipSuccessfulRequests: false,
    keyGenerator: (request) => {
      // Use phone number for login attempts, IP for others
      const identifier = request.body?.phoneNumber || request.user?.id || request.ip;
      return `auth:${identifier}`;
    }
  },

  // More lenient rate limit for file uploads
  upload: {
    max: 20,
    timeWindow: 15 * 60 * 1000, // 15 minutes
    skipSuccessfulRequests: true,
    keyGenerator: (request) => {
      return request.user?.id || request.ip;
    }
  }
};

/**
 * Create rate limit middleware configurations
 */
export function createRateLimitMiddleware() {
  return {
    general: rateLimitConfig.general,
    auth: rateLimitConfig.auth,
    upload: rateLimitConfig.upload
  };
}

export default createRateLimitMiddleware;