/**
 * Error Handling Middleware for Part Bank API
 */

import { createPRDErrorResponse } from '#app/utils';
import { HTTP_STATUS, ERROR_CODES } from '#app/constants';

/**
 * Create error handler for Fastify
 */
export function createErrorHandler(fastify) {
  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Validation errors from Fastify schema validation
    if (error.validation) {
      const response = createPRDErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        error.validation
      );
      return reply.status(HTTP_STATUS.VALIDATION_ERROR).send(response);
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      const response = createPRDErrorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests, please try again later'
      );
      return reply.status(HTTP_STATUS.TOO_MANY_REQUESTS).send(response);
    }

    // Multipart/file upload errors
    if (error.code === 'FST_FILES_LIMIT' || error.code === 'FST_FILE_TOO_LARGE') {
      const response = createPRDErrorResponse(
        ERROR_CODES.FILE_TOO_LARGE,
        'File size exceeds maximum allowed size'
      );
      return reply.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).send(response);
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      const response = createPRDErrorResponse(
        ERROR_CODES.INVALID_TOKEN,
        'Invalid or expired token'
      );
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
    }

    // Database errors
    if (error.code && error.code.startsWith('P')) {
      // Prisma errors
      if (error.code === 'P2002') {
        const response = createPRDErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Duplicate value found',
          { field: error.meta?.target }
        );
        return reply.status(HTTP_STATUS.CONFLICT).send(response);
      }
      
      if (error.code === 'P2025') {
        const response = createPRDErrorResponse(
          ERROR_CODES.ACCOUNT_NOT_FOUND,
          'Record not found'
        );
        return reply.status(HTTP_STATUS.NOT_FOUND).send(response);
      }
    }

    // Custom application errors
    if (error.statusCode) {
      const response = createPRDErrorResponse(
        error.name || ERROR_CODES.INTERNAL_ERROR,
        error.message,
        error.details
      );
      return reply.status(error.statusCode).send(response);
    }

    // Default error response
    const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const response = createPRDErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    );
    
    return reply.status(statusCode).send(response);
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    const response = createPRDErrorResponse(
      'NOT_FOUND',
      `Route ${request.method} ${request.url} not found`
    );
    return reply.status(HTTP_STATUS.NOT_FOUND).send(response);
  });
}

export default createErrorHandler;