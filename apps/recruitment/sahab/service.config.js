import { USER_ROLES, PERMISSIONS, HTTP_STATUS } from '@shared/core/constants';
import { getEnv } from '@shared/core/utils/env.utils';
import { getCurrentDir } from '@shared/core/utils/env.utils';

const currentDir = getCurrentDir(import.meta.url);

/**
 * Sahab Service Configuration
 * Public service with optional authentication for write operations
 */
export default {
  name: getEnv(currentDir, 'SERVICE_NAME', 'sahab-api'),
  baseUrl: getEnv(currentDir, 'SERVICE_BASE_URL', 'http://localhost:3003'),
  basePath: getEnv(currentDir, 'SERVICE_BASE_PATH', '/part/recruitment/sahab'),

  healthCheckPath: '/health',
  timeout: 30000,

  metadata: {
    type: 'recruitment',
    category: 'sahab',
    version: '1.0.0',
    description: 'Sahab service - public information with protected management',
    maintainer: 'recruitment-team',
  },

  authentication: {
    requireAuth: getEnv(currentDir, 'SERVICE_REQUIRE_AUTH', false, 'boolean'),
    requireRoles: [],
  },

  routes: [
    {
      path: '/part/recruitment/sahab',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Sahab operations',

      requireAuth: false, // Public by default
      requireRoles: [],

      methodConfigs: {
        GET: {
          requireAuth: false,
          requireRoles: [],
          description: 'Get sahab information (public)',
          permissions: [],
        },
        POST: {
          requireAuth: getEnv(
            currentDir,
            'REQUIRE_AUTH_FOR_CREATE',
            true,
            'boolean'
          ),
          requireRoles: [USER_ROLES.USER, USER_ROLES.ADMIN],
          description: 'Create sahab content',
          permissions: [PERMISSIONS.WRITE],
        },
        PUT: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Update sahab content',
          permissions: [PERMISSIONS.UPDATE],
        },
        DELETE: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Delete sahab content',
          permissions: [PERMISSIONS.DELETE],
        },
      },
    },

    {
      path: '/part/recruitment/sahab/:id',
      methods: ['GET', 'PUT', 'DELETE'],
      description: 'Individual sahab item operations',

      methodConfigs: {
        GET: {
          requireAuth: false,
          requireRoles: [],
          description: 'Get specific sahab item (public)',
        },
        PUT: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Update specific sahab item',
        },
        DELETE: {
          requireAuth: true,
          requireRoles: [USER_ROLES.ADMIN],
          description: 'Delete specific sahab item',
        },
      },
    },
  ],

  rateLimiting: {
    enabled: getEnv(currentDir, 'RATE_LIMIT_ENABLED', true, 'boolean'),
    windowMs: 300000, // 5 minutes (more lenient for public service)
    maxRequests: 200, // Higher limit for public access
  },

  features: {
    publicAccess: getEnv(currentDir, 'ENABLE_PUBLIC_ACCESS', true, 'boolean'),
    allowAnonymousCreation: getEnv(
      currentDir,
      'ALLOW_ANONYMOUS_CREATION',
      false,
      'boolean'
    ),
  },

  errorResponses: {
    [HTTP_STATUS.UNAUTHORIZED]: {
      message: 'Authentication required for this operation',
      code: 'SAHAB_AUTH_REQUIRED',
    },
    [HTTP_STATUS.FORBIDDEN]: {
      message: 'Insufficient permissions for sahab operation',
      code: 'SAHAB_INSUFFICIENT_PERMISSIONS',
    },
  },
};
