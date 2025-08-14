import { USER_ROLES, PERMISSIONS, HTTP_STATUS } from '@shared/core/constants';
import { getEnv } from '@shared/core/utils/env.utils';
import { getCurrentDir } from '@shared/core/utils/env.utils';

const currentDir = getCurrentDir(import.meta.url);

/**
 * User Management Service Configuration
 */
export default {
  name: getEnv(currentDir, 'SERVICE_NAME', 'user-management-api'),
  baseUrl: getEnv(currentDir, 'SERVICE_BASE_URL', 'http://localhost:3002'),
  basePath: getEnv(currentDir, 'SERVICE_BASE_PATH', '/part/recruitment/users'),

  healthCheckPath: '/health',
  timeout: 30000,

  metadata: {
    type: 'recruitment',
    category: 'user-management',
    version: '1.0.0',
    description: 'User management and administration service',
    maintainer: 'recruitment-team',
  },

  authentication: {
    requireAuth: true,
    requireRoles: [USER_ROLES.ADMIN], // Admin only service
  },

  routes: [
    {
      path: '/part/recruitment/users',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'User management operations',

      requireAuth: true,
      requireRoles: [USER_ROLES.ADMIN],

      methodConfigs: {
        GET: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'List users',
          permissions: [PERMISSIONS.READ_USERS],
        },
        POST: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Create user',
          permissions: [PERMISSIONS.WRITE_USERS],
        },
        PUT: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Update user',
          permissions: [PERMISSIONS.UPDATE_USERS],
        },
        DELETE: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Delete user',
          permissions: [PERMISSIONS.DELETE_USERS],
        },
      },
    },

    {
      path: '/part/recruitment/users/:id',
      methods: ['GET', 'PUT', 'DELETE'],
      description: 'Individual user operations',

      methodConfigs: {
        GET: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Get specific user',
        },
        PUT: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Update specific user',
        },
        DELETE: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Delete specific user',
        },
      },
    },
  ],

  rateLimiting: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 50, // Lower limit for admin operations
  },

  errorResponses: {
    [HTTP_STATUS.UNAUTHORIZED]: {
      message: 'Administrator authentication required',
      code: 'ADMIN_AUTH_REQUIRED',
    },
    [HTTP_STATUS.FORBIDDEN]: {
      message: 'Administrator privileges required',
      code: 'ADMIN_PRIVILEGES_REQUIRED',
    },
  },
};
