/**
 * Standardized API response utilities
 * Provides consistent response formats across all apps
 */

/**
 * Success response helper
 * @param {any} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Formatted success response
 */
export const successResponse = (data, message = 'Success', statusCode = 200) => ({
  status: 'success',
  message,
  data,
  timestamp: new Date().toISOString(),
  statusCode
});

/**
 * Error response helper
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {any} errors - Additional error details
 * @returns {Object} Formatted error response
 */
export const errorResponse = (message, statusCode = 500, errors = null) => ({
  status: 'error',
  message,
  errors,
  timestamp: new Date().toISOString(),
  statusCode
});

/**
 * Pagination response helper
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Formatted paginated response
 */
export const paginatedResponse = (data, page, limit, total) => ({
  status: 'success',
  data,
  pagination: {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  },
  timestamp: new Date().toISOString()
});

/**
 * Validation error response helper
 * @param {Array} validationErrors - Array of validation errors
 * @returns {Object} Formatted validation error response
 */
export const validationErrorResponse = (validationErrors) => ({
  status: 'error',
  message: 'Validation failed',
  errors: validationErrors,
  timestamp: new Date().toISOString(),
  statusCode: 400
});

/**
 * Not found response helper
 * @param {string} resource - Resource that was not found
 * @returns {Object} Formatted not found response
 */
export const notFoundResponse = (resource = 'Resource') => ({
  status: 'error',
  message: `${resource} not found`,
  timestamp: new Date().toISOString(),
  statusCode: 404
});

/**
 * Unauthorized response helper
 * @param {string} message - Unauthorized message
 * @returns {Object} Formatted unauthorized response
 */
export const unauthorizedResponse = (message = 'Unauthorized access') => ({
  status: 'error',
  message,
  timestamp: new Date().toISOString(),
  statusCode: 401
});

/**
 * Forbidden response helper
 * @param {string} message - Forbidden message
 * @returns {Object} Formatted forbidden response
 */
export const forbiddenResponse = (message = 'Access forbidden') => ({
  status: 'error',
  message,
  timestamp: new Date().toISOString(),
  statusCode: 403
}); 