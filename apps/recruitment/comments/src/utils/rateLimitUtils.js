import { rateLimitMiddleware } from '../../../../../packages/shared/utils/rateLimit.js';
import { VALIDATION_RULES, LOG_CONTEXTS } from '../constants/index.js';

export const createRateLimiter = () =>
  rateLimitMiddleware({
    windowMs: VALIDATION_RULES.RATE_LIMIT.WINDOW_MS,
    maxAttempts: VALIDATION_RULES.RATE_LIMIT.MAX_COMMENTS,
    actionName: 'comment_creation',
    logContext: LOG_CONTEXTS.RATE_LIMIT,
  });

export const commentRateLimit = limiter => limiter;
