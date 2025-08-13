/**
 * Error Handling Middleware
 * Provides centralized error handling for all Express applications
 */

import { logger } from '../utils/logger.js';
import { 
  AppError, 
  isOperationalError, 
  formatErrorResponse,
  createErrorFromPrisma,
  createErrorFromValidation
} from '../utils/errors.js';

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  let error = err;
  
  // Log the error
  logger.error('Unhandled error occurred', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }, error);

  // Handle Prisma errors
  if (error.code && error.code.startsWith('P')) {
    error = createErrorFromPrisma(error);
  }

  // Handle validation errors
  if (error.name === 'ValidationError' || error.name === 'ValidatorError') {
    error = createErrorFromValidation({
      isValid: false,
      errors: error.errors || [{ message: error.message }]
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  }

  if (error.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401);
  }

  // Handle Mongoose/MongoDB errors
  if (error.name === 'CastError') {
    error = new AppError('Invalid ID format', 400);
  }

  if (error.name === 'MongoError' && error.code === 11000) {
    error = new AppError('Duplicate field value', 409);
  }

  // Ensure error has required properties
  if (!error.statusCode) {
    error.statusCode = 500;
  }

  if (!error.message) {
    error.message = 'An unexpected error occurred';
  }

  // Format error response
  const errorResponse = formatErrorResponse(error);

  // Send error response
  res.status(error.statusCode).json(errorResponse);

  // Log operational vs programming errors
  if (isOperationalError(error)) {
    logger.warn('Operational error handled', {
      statusCode: error.statusCode,
      message: error.message,
      url: req.url
    });
  } else {
    logger.error('Programming error occurred', {
      statusCode: error.statusCode,
      message: error.message,
      url: req.url,
      stack: error.stack
    });
  }
};

/**
 * Async error wrapper - eliminates need for try-catch in async routes
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

/**
 * Request validation error handler
 */
export const validationErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const validationError = createErrorFromValidation({
      isValid: false,
      errors: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }))
    });
    return next(validationError);
  }
  next(err);
};

/**
 * Rate limiting error handler
 */
export const rateLimitErrorHandler = (err, req, res, next) => {
  if (err.type === 'RateLimit') {
    const rateLimitError = new AppError('Too many requests', 429, true, {
      retryAfter: err.retryAfter,
      limit: err.limit,
      current: err.current
    });
    return next(rateLimitError);
  }
  next(err);
};

/**
 * Database connection error handler
 */
export const databaseErrorHandler = (err, req, res, next) => {
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    const dbError = new AppError('Database connection failed', 503, true, {
      code: err.code,
      host: err.hostname,
      port: err.port
    });
    return next(dbError);
  }
  next(err);
};

/**
 * Security error handler
 */
export const securityErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    const securityError = new AppError('Invalid CSRF token', 403, true);
    return next(securityError);
  }
  next(err);
};

/**
 * Create error handling middleware stack
 */
export const createErrorHandlers = (options = {}) => {
  const middlewares = [];

  // Add specific error handlers based on options
  if (options.handleValidation) {
    middlewares.push(validationErrorHandler);
  }

  if (options.handleRateLimit) {
    middlewares.push(rateLimitErrorHandler);
  }

  if (options.handleDatabase) {
    middlewares.push(databaseErrorHandler);
  }

  if (options.handleSecurity) {
    middlewares.push(securityErrorHandler);
  }

  // Always add global error handler last
  middlewares.push(globalErrorHandler);

  return middlewares;
};

/**
 * Express error handling setup
 */
export const setupErrorHandling = (app, options = {}) => {
  // 404 handler (must be before error handlers)
  app.use(notFoundHandler);

  // Add error handling middleware
  const errorHandlers = createErrorHandlers(options);
  errorHandlers.forEach(handler => app.use(handler));

  // Graceful shutdown handler
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Exit the process for uncaught exceptions
    process.exit(1);
  });

  return app;
};
