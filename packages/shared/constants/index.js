/**
 * Shared Application Constants
 * Common constants and configurations used across all apps
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Common Validation Rules
export const VALIDATION_RULES = {
  TEXT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 1000,
  },
  ID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  URL: {
    PATTERN: /^https?:\/\/.+/,
  },
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_ATTEMPTS: 5,
  },
};

// Database Configuration
export const DB_CONFIG = {
  SOFT_DELETE_FIELD: 'isDeleted',
  TIMESTAMP_FIELDS: ['createdAt', 'updatedAt'],
  DEFAULT_USER_ID: 'default-user-id',
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// Common API Response Messages
export const API_MESSAGES = {
  SUCCESS: {
    RECORDS_RETRIEVED: 'Records retrieved successfully',
    RECORD_CREATED: 'Record created successfully',
    RECORD_UPDATED: 'Record updated successfully',
    RECORD_DELETED: 'Record deleted successfully',
    RECORD_FOUND: 'Record found successfully',
    SEARCH_COMPLETED: 'Search completed successfully',
    STATS_RETRIEVED: 'Statistics retrieved successfully',
  },
  ERROR: {
    VALIDATION_FAILED: 'Validation failed',
    RECORD_NOT_FOUND: 'Record not found',
    RECORD_ALREADY_EXISTS: 'Record already exists',
    RECORD_ALREADY_DELETED: 'Record is already deleted',
    CANNOT_UPDATE_DELETED: 'Record is deleted and cannot be updated',
    CANNOT_DELETE_RECORD: 'Cannot delete record',
    RATE_LIMIT_EXCEEDED:
      'Rate limit exceeded. Please wait before trying again.',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    INTERNAL_ERROR: 'Internal server error',
  },
};

// Common Logging Contexts
export const LOG_CONTEXTS = {
  SERVICE: 'Service',
  CONTROLLER: 'Controller',
  DATABASE: 'Database',
  VALIDATION: 'Validation',
  RATE_LIMIT: 'RateLimit',
  AUTH: 'Authentication',
  MIDDLEWARE: 'Middleware',
};

// Prisma Error Codes
export const PRISMA_ERROR_CODES = {
  RECORD_NOT_FOUND: 'P2025',
  UNIQUE_CONSTRAINT_VIOLATION: 'P2002',
  FOREIGN_KEY_CONSTRAINT_VIOLATION: 'P2003',
  CONNECTION_ERROR: 'P1001',
  TIMEOUT_ERROR: 'P1008',
  DATABASE_NOT_FOUND: 'P1009',
  ACCESS_DENIED: 'P1010',
  TLS_CONNECTION_ERROR: 'P1011',
};

// Environment Variables
export const ENV_VARS = {
  PORT: 'PORT',
  HOST: 'HOST',
  NODE_ENV: 'NODE_ENV',
  LOG_LEVEL: 'LOG_LEVEL',
  DATABASE_URL: 'DATABASE_URL',
  JWT_SECRET: 'JWT_SECRET',
  API_KEY: 'API_KEY',
};

// Default Values
export const DEFAULTS = {
  PORT: 3000,
  HOST: '0.0.0.0',
  LOG_LEVEL: 'INFO',
  SEARCH_LIMIT: 10,
  PAGINATION_LIMIT: 10,
  MAX_PAGINATION_LIMIT: 100,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_ATTEMPTS: 5,
};

// Common HTTP Headers
export const HTTP_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  USER_AGENT: 'User-Agent',
  X_REQUESTED_WITH: 'X-Requested-With',
  X_API_KEY: 'X-API-Key',
  X_RATE_LIMIT_LIMIT: 'X-RateLimit-Limit',
  X_RATE_LIMIT_REMAINING: 'X-RateLimit-Remaining',
  X_RATE_LIMIT_RESET: 'X-RateLimit-Reset',
};

// Common Content Types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  TEXT: 'text/plain',
  HTML: 'text/html',
};

// User Roles Constants
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  STUDENT: 'student',
  TEACHER: 'teacher',
  INTERN: 'intern',
  SUPERVISOR: 'supervisor',
  MODERATOR: 'moderator',
  GUEST: 'guest',
};

// Permissions Constants
export const PERMISSIONS = {
  // Generic permissions
  READ: 'read',
  WRITE: 'write',
  UPDATE: 'update',
  DELETE: 'delete',

  // Resource-specific permissions
  READ_COMMENTS: 'read:comments',
  WRITE_COMMENTS: 'write:comments',
  UPDATE_COMMENTS: 'update:comments',
  DELETE_COMMENTS: 'delete:comments',

  READ_USERS: 'read:users',
  WRITE_USERS: 'write:users',
  UPDATE_USERS: 'update:users',
  DELETE_USERS: 'delete:users',

  READ_PROFILE: 'read:profile',
  WRITE_PROFILE: 'write:profile',

  READ_COURSES: 'read:courses',
  WRITE_COURSES: 'write:courses',

  READ_PROJECTS: 'read:projects',
  WRITE_PROJECTS: 'write:projects',

  // Admin permissions
  ADMIN_ALL: '*',
  MANAGE_USERS: 'manage:users',
  MANAGE_ROLES: 'manage:roles',
  VIEW_LOGS: 'view:logs',
  MANAGE_SYSTEM: 'manage:system',
};

// Authentication Constants
export const AUTH_CONSTANTS = {
  TOKEN_TYPES: {
    ACCESS: 'access',
    REFRESH: 'refresh',
  },
  HEADER_NAMES: {
    AUTHORIZATION: 'Authorization',
    API_KEY: 'X-API-Key',
    USER_ID: 'X-User-ID',
    USER_EMAIL: 'X-User-Email',
    USER_ROLES: 'X-User-Roles',
  },
  JWT_DEFAULTS: {
    EXPIRES_IN: '7d',
    REFRESH_EXPIRES_IN: '30d',
    ISSUER: 'part-internship-gateway',
    AUDIENCE: 'part-internship-services',
  },
  PASSWORD_REQUIREMENTS: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false,
  },
};

// Service Discovery Constants
export const SERVICE_DISCOVERY = {
  REGISTRATION_PATH: '/register-service',
  HEALTH_CHECK_PATH: '/health',
  CONFIG_FILE_NAME: 'service.config.js',
  DEFAULT_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

// Rate Limiting Constants
export const RATE_LIMIT = {
  WINDOWS: {
    SHORT: 60 * 1000, // 1 minute
    MEDIUM: 15 * 60 * 1000, // 15 minutes
    LONG: 60 * 60 * 1000, // 1 hour
  },
  LIMITS: {
    AUTH_ATTEMPTS: 5,
    API_REQUESTS: 100,
    STRICT_REQUESTS: 10,
  },
};

// Common Time Constants
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
};

// Common Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_WITH_SPACES: /^[a-zA-Z0-9\s]+$/,
};
