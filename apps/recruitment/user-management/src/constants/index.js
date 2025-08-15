/**
 * User Management App Constants
 */

export { HTTP_STATUS } from '../../../../../packages/shared/constants/index.js';

// Local Prisma error codes
export const PRISMA_ERROR_CODES = {
  UNIQUE_CONSTRAINT: 'P2002',
  FOREIGN_KEY_CONSTRAINT: 'P2003',
  RECORD_NOT_FOUND: 'P2025',
};

export const VALIDATION_RULES = {
  USER: {
    USERNAME: { MIN_LENGTH: 3, MAX_LENGTH: 50 },
    PASSWORD: { MIN_LENGTH: 6, MAX_LENGTH: 128 },
    EMAIL: { MAX_LENGTH: 255 },
    FIRST_NAME: { MAX_LENGTH: 100 },
    LAST_NAME: { MAX_LENGTH: 100 },
    PHONE: { MAX_LENGTH: 20 },
    REQUIRED_FIELDS: ['email', 'username', 'password'],
  },
  ROLE: {
    NAME: { MIN_LENGTH: 2, MAX_LENGTH: 50 },
    DESCRIPTION: { MAX_LENGTH: 255 },
    REQUIRED_FIELDS: ['name'],
  },
  RATE_LIMIT: { WINDOW_MS: 60 * 1000, MAX_REQUESTS: 10 },
};

export const DB_CONFIG = {
  SOFT_DELETE_FIELD: 'isDeleted',
  TIMESTAMP_FIELDS: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  PASSWORD_HASH_ROUNDS: 12,
};

export const JWT_CONFIG = {
  EXPIRES_IN: '7d',
  ALGORITHM: 'HS256',
  ISSUER: 'user-management-api',
};

export const API_MESSAGES = {
  SUCCESS: {
    USERS_RETRIEVED: 'Users retrieved successfully',
    USER_CREATED: 'User created successfully',
    USER_UPDATED: 'User updated successfully',
    USER_DELETED: 'User deleted successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PROFILE_UPDATED: 'Profile updated successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    ROLES_RETRIEVED: 'Roles retrieved successfully',
    ROLE_CREATED: 'Role created successfully',
    ROLE_UPDATED: 'Role updated successfully',
    ROLE_DELETED: 'Role deleted successfully',
    ROLE_ASSIGNED: 'Role assigned successfully',
    ROLE_REVOKED: 'Role revoked successfully',
  },
  ERROR: {
    USER_NOT_FOUND: 'User not found',
    ROLE_NOT_FOUND: 'Role not found',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    USERNAME_ALREADY_EXISTS: 'Username already exists',
    ROLE_ALREADY_EXISTS: 'Role name already exists',
    UNAUTHORIZED: 'Unauthorized access',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    INVALID_TOKEN: 'Invalid or expired token',
    WEAK_PASSWORD: 'Password does not meet security requirements',
    ACCOUNT_DISABLED: 'Account is disabled',
    ACCOUNT_NOT_VERIFIED: 'Account is not verified',
    ROLE_IN_USE: 'Role cannot be deleted as it is assigned to users',
  },
};

export const LOG_CONTEXTS = {
  SERVICE: 'UserManagementAPI',
  CONTROLLER: 'UserController',
  AUTH_CONTROLLER: 'AuthController',
  ROLE_CONTROLLER: 'RoleController',
  DATABASE: 'UserManagementDB',
  VALIDATION: 'UserValidation',
  RATE_LIMIT: 'UserRateLimit',
  AUTH: 'Authentication',
  AUTHORIZATION: 'Authorization',
};

export const DEFAULTS = {
  SEARCH_LIMIT: 10,
  PAGE_SIZE: 20,
  PORT: 3002,
  HOST: '0.0.0.0',
};

export const ENV_VARS = {
  PORT: 'PORT',
  HOST: 'HOST',
  NODE_ENV: 'NODE_ENV',
  DATABASE_URL: 'DATABASE_URL',
  JWT_SECRET: 'JWT_SECRET',
  BCRYPT_ROUNDS: 'BCRYPT_ROUNDS',
};

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
};

export const PERMISSIONS = {
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
  },
  ROLES: {
    CREATE: 'roles:create',
    READ: 'roles:read',
    UPDATE: 'roles:update',
    DELETE: 'roles:delete',
  },
  SYSTEM: {
    READ: 'system:read',
    UPDATE: 'system:update',
  },
};
