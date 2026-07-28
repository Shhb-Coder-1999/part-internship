/**
 * Application Constants
 */

// Environment Variables
export const ENV_VARS = {
  PORT: 'PORT',
  HOST: 'HOST',
  NODE_ENV: 'NODE_ENV',
  DATABASE_URL: 'DATABASE_URL',
  JWT_SECRET: 'JWT_SECRET',
  GATEWAY_URL: 'GATEWAY_URL',
  GATEWAY_AUTH_ENDPOINT: 'GATEWAY_AUTH_ENDPOINT',
  RATE_LIMIT_MAX: 'RATE_LIMIT_MAX',
  RATE_LIMIT_TIMEWINDOW: 'RATE_LIMIT_TIMEWINDOW',
  MAX_FILE_SIZE: 'MAX_FILE_SIZE',
  ALLOWED_FILE_TYPES: 'ALLOWED_FILE_TYPES',
  LOG_LEVEL: 'LOG_LEVEL',
  CORS_ORIGIN: 'CORS_ORIGIN',
  CORS_METHODS: 'CORS_METHODS',
  API_TITLE: 'API_TITLE',
  API_DESCRIPTION: 'API_DESCRIPTION',
  API_VERSION: 'API_VERSION'
};

// Default Values
export const DEFAULTS = {
  PORT: 3002,
  HOST: '0.0.0.0',
  NODE_ENV: 'development',
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_TIMEWINDOW: 900000, // 15 minutes
  MAX_FILE_SIZE: 5242880, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png'],
  LOG_LEVEL: 'info',
  CORS_ORIGIN: '*',
  CORS_METHODS: 'GET,POST,PUT,DELETE,OPTIONS',
  API_TITLE: 'Part Bank API',
  API_DESCRIPTION: 'Minimal banking-style API with user auth, deposit accounts, and transaction feed',
  API_VERSION: '1.0.0'
};

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
  PAYLOAD_TOO_LARGE: 413,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// API Messages
export const API_MESSAGES = {
  SUCCESS: {
    USER_CREATED: 'User created successfully',
    LOGIN_SUCCESS: 'Login successful', 
    LOGOUT_SUCCESS: 'Logout successful',
    ACCOUNT_CREATED: 'Deposit account created successfully',
    ACCOUNT_DELETED: 'Deposit account deleted successfully',
    ACCOUNTS_DELETED: 'All deposit accounts deleted successfully',
    RECORDS_RETRIEVED: 'Records retrieved successfully'
  },
  ERROR: {
    VALIDATION_FAILED: 'Validation failed',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    USER_NOT_FOUND: 'User not found',
    ACCOUNT_NOT_FOUND: 'Deposit account not found',
    PHONE_EXISTS: 'Phone number already exists',
    INVALID_CREDENTIALS: 'Invalid credentials',
    INVALID_TOKEN: 'Invalid or expired token',
    CARD_NUMBER_EXISTS: 'Card number already exists',
    FILE_TOO_LARGE: 'File size exceeds maximum allowed size',
    INVALID_FILE_TYPE: 'Invalid file type',
    INTERNAL_ERROR: 'Internal server error',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later'
  }
};

// Validation Rules
export const VALIDATION_RULES = {
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[\u0600-\u06FFa-zA-Z\s\-]+$/ // Unicode letters, spaces, hyphens
  },
  ID_NUMBER: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 20,
    PATTERN: /^\d+$/
  },
  PHONE_NUMBER: {
    PATTERN: /^09\d{9}$/
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128
  },
  ADDRESS: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 300
  },
  POSTAL_CODE: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 12,
    PATTERN: /^\d+$/
  },
  CARD_NUMBER: {
    LENGTH: 16,
    PATTERN: /^\d{16}$/
  },
  PAGINATION: {
    MIN_PAGE: 1,
    MIN_PAGE_SIZE: 1,
    MAX_PAGE_SIZE: 100,
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 50,
    DEFAULT_TRANSACTION_PAGE_SIZE: 20
  }
};

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 5242880, // 5MB in bytes
  ALLOWED_TYPES: ['image/jpeg', 'image/png'],
  FIELD_NAME: 'nationalCardImage'
};

// Business Logic Constants
export const BUSINESS_RULES = {
  PAYMENT_PERIODS: [12, 24, 48],
  MIN_BALANCE: 0,
  MIN_AMOUNT: 0,
  CARD_NUMBER_PREFIX: '5555' // For generated card numbers
};

// Database Enums
export const DB_ENUMS = {
  USER_STATUS: {
    ACTIVE: 'ACTIVE',
    LOCKED: 'LOCKED', 
    DISABLED: 'DISABLED'
  },
  TRANSACTION_TYPE: {
    DEPOSIT: 'DEPOSIT',
    WITHDRAW: 'WITHDRAW'
  },
  PAYMENT_PERIOD: {
    TWELVE: 'TWELVE',
    TWENTY_FOUR: 'TWENTY_FOUR',
    FORTY_EIGHT: 'FORTY_EIGHT'
  }
};

// Error Codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PHONE_EXISTS: 'PHONE_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};