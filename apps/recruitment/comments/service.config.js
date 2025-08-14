import { USER_ROLES, PERMISSIONS, HTTP_STATUS } from '@shared/core/constants';
import { getEnv } from '@shared/core/utils/env.utils';
import { getCurrentDir } from '@shared/core/utils/env.utils';

// Get current service directory
const currentDir = getCurrentDir(import.meta.url);

/**
 * Comments Service Configuration
 * Defines how this service should be registered with the gateway
 */
export default {
  // Service Identity
  name: getEnv(currentDir, 'SERVICE_NAME', 'comments-api'),
  baseUrl: getEnv(currentDir, 'SERVICE_BASE_URL', 'http://localhost:3001'),
  basePath: getEnv(currentDir, 'SERVICE_BASE_PATH', '/part/recruitment/comments'),
  
  // Health Check Configuration
  healthCheckPath: '/health',
  timeout: 30000,

  // Service Metadata
  metadata: {
    type: 'recruitment',
    category: 'comments',
    version: '1.0.0',
    description: 'Comments management service',
    maintainer: 'recruitment-team',
  },

  // Authentication Configuration - Public service (no auth required)
  authentication: {
    requireAuth: false,
    requireRoles: [],
  },

  // Route Definitions
  routes: [
    {
      path: '/part/recruitment/comments',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Comments CRUD operations',
      
      // Default route-level settings - Public access
      requireAuth: false,
      requireRoles: [],
      
      // Method-specific configurations - All public
      methodConfigs: {
        GET: {
          requireAuth: false,
          requireRoles: [],
          description: 'Get comments - Public access',
        },
        POST: {
          requireAuth: false,
          requireRoles: [],
          description: 'Create new comment - Public access',
        },
        PUT: {
          requireAuth: false,
          requireRoles: [],
          description: 'Update comment - Public access',
        },
        DELETE: {
          requireAuth: false,
          requireRoles: [],
          description: 'Delete comment - Public access',
        },
      },
    },
    
    // Specific comment routes
    {
      path: '/part/recruitment/comments/:id',
      methods: ['GET', 'PUT', 'DELETE'],
      description: 'Individual comment operations',
      
      methodConfigs: {
        GET: {
          requireAuth: false,
          requireRoles: [],
          description: 'Get specific comment - Public access',
        },
        PUT: {
          requireAuth: false,
          requireRoles: [],
          description: 'Update specific comment - Public access',
        },
        DELETE: {
          requireAuth: false,
          requireRoles: [],
          description: 'Delete specific comment - Public access',
        },
      },
    },
  ],

  // Rate Limiting Configuration
  rateLimiting: {
    enabled: getEnv(currentDir, 'RATE_LIMIT_ENABLED', true, 'boolean'),
    windowMs: getEnv(currentDir, 'RATE_LIMIT_WINDOW_MS', 900000, 'number'),
    maxRequests: getEnv(currentDir, 'RATE_LIMIT_MAX_REQUESTS', 100, 'number'),
  },

  // Feature Flags
  features: {
    enableCommentThreads: getEnv(currentDir, 'ENABLE_COMMENT_THREADS', true, 'boolean'),
    enableCommentLikes: getEnv(currentDir, 'ENABLE_COMMENT_LIKES', true, 'boolean'),
    enableModeration: getEnv(currentDir, 'ENABLE_MODERATION', false, 'boolean'),
  },

  // Error Responses
  errorResponses: {
    [HTTP_STATUS.UNAUTHORIZED]: {
      message: 'Authentication required to access comments',
      code: 'COMMENTS_AUTH_REQUIRED',
    },
    [HTTP_STATUS.FORBIDDEN]: {
      message: 'Insufficient permissions for comment operation',
      code: 'COMMENTS_INSUFFICIENT_PERMISSIONS',
    },
    [HTTP_STATUS.NOT_FOUND]: {
      message: 'Comment not found',
      code: 'COMMENT_NOT_FOUND',
    },
  },
};
