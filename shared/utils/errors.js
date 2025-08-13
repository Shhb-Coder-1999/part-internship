/**
 * Custom Error Classes
 * Provides structured error handling across all applications
 */

// Base application error class
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.stack = this.stack || new Error().stack;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// HTTP-specific errors
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = null) {
    super(message, 401, true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = null) {
    super(message, 403, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details = null) {
    super(message, 409, true, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 422, true, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details = null) {
    super(message, 429, true, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details = null) {
    super(message, 500, true, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', details = null) {
    super(message, 503, true, details);
  }
}

// Database-specific errors
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, true, details);
  }
}

export class ConnectionError extends AppError {
  constructor(message = 'Database connection failed', details = null) {
    super(message, 503, true, details);
  }
}

// Authentication/Authorization errors
export class TokenExpiredError extends AppError {
  constructor(message = 'Token expired', details = null) {
    super(message, 401, true, details);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token', details = null) {
    super(message, 401, true, details);
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(message = 'Insufficient permissions', details = null) {
    super(message, 403, true, details);
  }
}

// Business logic errors
export class BusinessLogicError extends AppError {
  constructor(message = 'Business logic violation', details = null) {
    super(message, 400, true, details);
  }
}

export class ResourceStateError extends AppError {
  constructor(message = 'Resource is in invalid state for this operation', details = null) {
    super(message, 400, true, details);
  }
}

// Utility functions for error handling
export const isOperationalError = (error) => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

export const createErrorFromPrisma = (prismaError) => {
  switch (prismaError.code) {
    case 'P2002':
      return new ConflictError('Resource already exists', { field: prismaError.meta?.target });
    case 'P2025':
      return new NotFoundError('Resource not found');
    case 'P2003':
      return new BadRequestError('Invalid reference', { field: prismaError.meta?.field_name });
    case 'P2024':
      return new ConnectionError('Database connection timeout');
    case 'P2021':
      return new DatabaseError('Table does not exist');
    case 'P2022':
      return new DatabaseError('Column does not exist');
    default:
      return new DatabaseError('Database operation failed', { code: prismaError.code });
  }
};

export const createErrorFromValidation = (validationResult) => {
  if (validationResult && !validationResult.isValid) {
    return new ValidationError('Validation failed', validationResult.errors);
  }
  return null;
};

// Error response formatter
export const formatErrorResponse = (error) => {
  const response = {
    status: 'error',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    statusCode: error.statusCode || 500
  };

  if (error.details) {
    response.details = error.details;
  }

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  return response;
};
