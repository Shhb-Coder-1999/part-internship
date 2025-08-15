/**
 * Centralized Response Utilities
 * Provides consistent API response formatting across all applications
 */

import { HTTP_STATUS, API_MESSAGES } from '../constants/index.js';

/**
 * Create a success response
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata
 * @returns {Object} Formatted success response
 */
export function createSuccessResponse(data = null, message = API_MESSAGES.SUCCESS.RECORDS_RETRIEVED, meta = {}) {
  return {
    success: true,
    message,
    data,
    ...meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response
 * @param {string} error - Error type
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error response
 */
export function createErrorResponse(
  error = 'Internal Server Error',
  message = API_MESSAGES.ERROR.INTERNAL_ERROR,
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details = null
) {
  const response = {
    success: false,
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  return response;
}

/**
 * Create a validation error response
 * @param {Array|Object} validationErrors - Validation errors
 * @param {string} message - Error message
 * @returns {Object} Formatted validation error response
 */
export function createValidationErrorResponse(
  validationErrors,
  message = API_MESSAGES.ERROR.VALIDATION_FAILED
) {
  return createErrorResponse(
    'Validation Error',
    message,
    HTTP_STATUS.BAD_REQUEST,
    { validation: validationErrors }
  );
}

/**
 * Create a paginated response
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 * @returns {Object} Formatted paginated response
 */
export function createPaginatedResponse(
  data,
  pagination,
  message = API_MESSAGES.SUCCESS.RECORDS_RETRIEVED
) {
  return {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || 0,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an authentication error response
 * @param {string} message - Error message
 * @returns {Object} Formatted authentication error response
 */
export function createAuthErrorResponse(message = API_MESSAGES.ERROR.UNAUTHORIZED) {
  return createErrorResponse(
    'Unauthorized',
    message,
    HTTP_STATUS.UNAUTHORIZED
  );
}

/**
 * Create a forbidden error response
 * @param {string} message - Error message
 * @returns {Object} Formatted forbidden error response
 */
export function createForbiddenErrorResponse(message = API_MESSAGES.ERROR.FORBIDDEN) {
  return createErrorResponse(
    'Forbidden',
    message,
    HTTP_STATUS.FORBIDDEN
  );
}

/**
 * Create a not found error response
 * @param {string} resource - Resource name
 * @param {string} id - Resource ID
 * @returns {Object} Formatted not found error response
 */
export function createNotFoundErrorResponse(resource = 'Resource', id = null) {
  const message = id 
    ? `${resource} with ID '${id}' not found`
    : `${resource} not found`;
    
  return createErrorResponse(
    'Not Found',
    message,
    HTTP_STATUS.NOT_FOUND
  );
}

/**
 * Create a conflict error response
 * @param {string} message - Error message
 * @returns {Object} Formatted conflict error response
 */
export function createConflictErrorResponse(message = 'Resource already exists') {
  return createErrorResponse(
    'Conflict',
    message,
    HTTP_STATUS.CONFLICT
  );
}

/**
 * Create a rate limit error response
 * @param {string} message - Error message
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {Object} Formatted rate limit error response
 */
export function createRateLimitErrorResponse(
  message = API_MESSAGES.ERROR.RATE_LIMIT_EXCEEDED,
  rateLimitInfo = {}
) {
  return createErrorResponse(
    'Too Many Requests',
    message,
    HTTP_STATUS.TOO_MANY_REQUESTS,
    rateLimitInfo
  );
}

/**
 * Create a server error response
 * @param {string} message - Error message
 * @param {Object} error - Original error object (in development mode)
 * @returns {Object} Formatted server error response
 */
export function createServerErrorResponse(message = API_MESSAGES.ERROR.INTERNAL_ERROR, error = null) {
  const response = createErrorResponse(
    'Internal Server Error',
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );

  // Only include error details in development mode
  if (process.env.NODE_ENV === 'development' && error) {
    response.details = {
      stack: error.stack,
      name: error.name,
    };
  }

  return response;
}

/**
 * Create a user token response
 * @param {Object} user - User data
 * @param {Object} tokenData - Token information
 * @param {string} message - Success message
 * @returns {Object} Formatted user token response
 */
export function createUserTokenResponse(
  user,
  tokenData,
  message = 'Authentication successful'
) {
  return {
    success: true,
    message,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles || [],
      },
      ...tokenData,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fastify response helper
 * @param {Object} reply - Fastify reply object
 * @param {Object} response - Response object
 * @param {number} statusCode - HTTP status code (optional, defaults to response.statusCode)
 */
export function sendResponse(reply, response, statusCode = null) {
  const status = statusCode || response.statusCode || HTTP_STATUS.OK;
  return reply.status(status).send(response);
}

/**
 * Send success response using Fastify reply
 * @param {Object} reply - Fastify reply object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata
 * @param {number} statusCode - HTTP status code
 */
export function sendSuccessResponse(
  reply,
  data = null,
  message = API_MESSAGES.SUCCESS.RECORDS_RETRIEVED,
  meta = {},
  statusCode = HTTP_STATUS.OK
) {
  const response = createSuccessResponse(data, message, meta);
  return sendResponse(reply, response, statusCode);
}

/**
 * Send error response using Fastify reply
 * @param {Object} reply - Fastify reply object
 * @param {string} error - Error type
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 */
export function sendErrorResponse(
  reply,
  error = 'Internal Server Error',
  message = API_MESSAGES.ERROR.INTERNAL_ERROR,
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details = null
) {
  const response = createErrorResponse(error, message, statusCode, details);
  return sendResponse(reply, response, statusCode);
}

/**
 * Send paginated response using Fastify reply
 * @param {Object} reply - Fastify reply object
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
export function sendPaginatedResponse(
  reply,
  data,
  pagination,
  message = API_MESSAGES.SUCCESS.RECORDS_RETRIEVED
) {
  const response = createPaginatedResponse(data, pagination, message);
  return sendResponse(reply, response, HTTP_STATUS.OK);
}