/**
 * Fastify Error Handling Utilities
 * Provides centralized error handling for all Fastify applications
 */

import { logger } from '../utils/logger.js';
import {
  AppError,
  isOperationalError,
  formatErrorResponse,
  createErrorFromPrisma,
  createErrorFromValidation,
} from '../utils/errors.js';

/**
 * Fastify error handler
 */
export const fastifyErrorHandler = (error, request, reply) => {
  let processedError = error;

  // Log the error
  logger.error(
    'Unhandled error occurred',
    {
      url: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
    error
  );

  // Handle Prisma errors
  if (error.code && error.code.startsWith('P')) {
    processedError = createErrorFromPrisma(error);
  }

  // Handle Fastify validation errors
  if (error.validation) {
    processedError = createErrorFromValidation({
      isValid: false,
      errors: error.validation,
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    processedError = new AppError('Invalid token', 401);
  }

  if (error.name === 'TokenExpiredError') {
    processedError = new AppError('Token expired', 401);
  }

  // Handle Mongoose/MongoDB errors
  if (error.name === 'CastError') {
    processedError = new AppError('Invalid ID format', 400);
  }

  if (error.name === 'MongoError' && error.code === 11000) {
    processedError = new AppError('Duplicate field value', 409);
  }

  // Handle FST errors (Fastify-specific)
  if (error.code && error.code.startsWith('FST_')) {
    switch (error.code) {
      case 'FST_ERR_VALIDATION':
        processedError = new AppError('Validation failed', 400);
        break;
      case 'FST_ERR_NOT_FOUND':
        processedError = new AppError('Route not found', 404);
        break;
      default:
        processedError = new AppError('Request processing failed', 400);
    }
  }

  // Ensure error has required properties
  if (!processedError.statusCode) {
    processedError.statusCode = 500;
  }

  if (!processedError.message) {
    processedError.message = 'An unexpected error occurred';
  }

  // Format error response
  const errorResponse = formatErrorResponse(processedError);

  // Send error response
  reply.status(processedError.statusCode).send(errorResponse);

  // Log operational vs programming errors
  if (isOperationalError(processedError)) {
    logger.warn('Operational error handled', {
      statusCode: processedError.statusCode,
      message: processedError.message,
      url: request.url,
    });
  } else {
    logger.error('Programming error occurred', {
      statusCode: processedError.statusCode,
      message: processedError.message,
      url: request.url,
      stack: processedError.stack,
    });
  }
};

/**
 * Fastify 404 handler
 */
export const fastifyNotFoundHandler = (request, reply) => {
  reply.status(404).send({
    success: false,
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async handler wrapper for Fastify routes
 * (Note: Fastify handles async functions natively, so this is mainly for compatibility)
 */
export const asyncHandler = (fn) => {
  return async (request, reply) => {
    try {
      return await fn(request, reply);
    } catch (error) {
      throw error; // Let Fastify's error handler deal with it
    }
  };
};

/**
 * Fastify pre-handler for request validation
 */
export const validationPreHandler = async (request, reply) => {
  // Fastify handles validation automatically with JSON Schema
  // This is a placeholder for custom validation logic if needed
};

/**
 * Rate limiting error formatter for Fastify
 */
export const rateLimitErrorFormatter = (request, context) => ({
  success: false,
  error: 'Rate limit exceeded',
  message: `Too many requests, retry in ${Math.round(context.ttl / 1000)} seconds`,
  statusCode: 429,
  retryAfter: Math.round(context.ttl / 1000),
  timestamp: new Date().toISOString(),
});

/**
 * Database connection error handler for Fastify
 */
export const handleDatabaseError = (error, request) => {
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return new AppError('Database connection failed', 503, true, {
      code: error.code,
      host: error.hostname,
      port: error.port,
    });
  }
  return error;
};

/**
 * Security error handler for Fastify
 */
export const handleSecurityError = (error, request) => {
  if (error.code === 'EBADCSRFTOKEN') {
    return new AppError('Invalid CSRF token', 403, true);
  }
  return error;
};

/**
 * Setup error handling for Fastify instance
 */
export const setupFastifyErrorHandling = (fastify, options = {}) => {
  // Register error handler
  fastify.setErrorHandler(fastifyErrorHandler);

  // Register 404 handler
  fastify.setNotFoundHandler(fastifyNotFoundHandler);

  // Register hooks for additional error processing
  if (options.handleValidation) {
    fastify.addHook('preValidation', validationPreHandler);
  }

  // Graceful shutdown handlers
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Exit the process for uncaught exceptions
    process.exit(1);
  });

  return fastify;
};

/**
 * Create standard Fastify error response
 */
export const createFastifyErrorResponse = (
  message,
  statusCode = 500,
  details = null
) => ({
  success: false,
  error: 'Request Error',
  message,
  statusCode,
  ...(details && { details }),
  timestamp: new Date().toISOString(),
});

/**
 * Create standard Fastify success response
 */
export const createFastifySuccessResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

/**
 * Fastify schema error formatter
 */
export const schemaErrorFormatter = (errors, dataVar) => {
  return new Error(
    `${dataVar} validation failed: ${errors.map((e) => e.message).join(', ')}`
  );
};

/**
 * Export legacy Express functions for backward compatibility
 * These should be removed once all services are migrated to Fastify
 */
export const globalErrorHandler = fastifyErrorHandler; // Legacy alias
export const notFoundHandler = fastifyNotFoundHandler; // Legacy alias
export const setupErrorHandling = setupFastifyErrorHandling; // Legacy alias

export default {
  fastifyErrorHandler,
  fastifyNotFoundHandler,
  setupFastifyErrorHandling,
  asyncHandler,
  validationPreHandler,
  rateLimitErrorFormatter,
  handleDatabaseError,
  handleSecurityError,
  createFastifyErrorResponse,
  createFastifySuccessResponse,
  schemaErrorFormatter,
};
