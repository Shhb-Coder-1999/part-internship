import { USER_ROLES, PERMISSIONS, HTTP_STATUS } from '@shared/core/constants';

/**
 * Root Services Configuration
 * This file allows for centralized service configuration
 * Individual services can override these settings with their own service.config.js
 */

export default {
  // Global service defaults
  defaults: {
    timeout: 30000,
    healthCheckPath: '/health',
    authentication: {
      requireAuth: true,
      requireRoles: [USER_ROLES.USER, USER_ROLES.ADMIN],
    },
    rateLimiting: {
      enabled: true,
      windowMs: 900000, // 15 minutes
      maxRequests: 100,
    },
  },

  // Service configurations
  services: [
    // Can manually register services here if needed
    // These will be merged with auto-discovered services
    // Example manual configuration:
    /*
    {
      name: 'external-api',
      baseUrl: 'https://external-service.com',
      basePath: '/part/external',
      metadata: {
        type: 'external',
        category: 'third-party',
      },
      routes: [
        {
          path: '/part/external/*',
          methods: ['GET'],
          requireAuth: false,
          isPublic: true,
        },
      ],
    },
    */
  ],

  // Gateway-specific configuration
  gateway: {
    port: process.env.GATEWAY_PORT || 3000,
    host: process.env.GATEWAY_HOST || 'localhost',

    // Discovery settings
    discovery: {
      autoDiscover: true,
      configFileName: 'service.config.js',
      healthCheckInterval: 60000, // 1 minute
    },

    // Security settings
    security: {
      enableRateLimit: true,
      enableCors: true,
      enableCompression: true,
      enableHelmet: true,
    },

    // Logging settings
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      enableRequestLogging: true,
      enableErrorLogging: true,
    },
  },

  // Environment-specific overrides
  environments: {
    development: {
      gateway: {
        logging: {
          level: 'debug',
        },
      },
      defaults: {
        authentication: {
          // More lenient in development
          requireAuth: false,
        },
      },
    },

    production: {
      gateway: {
        logging: {
          level: 'warn',
        },
      },
      defaults: {
        authentication: {
          requireAuth: true,
        },
        rateLimiting: {
          enabled: true,
          maxRequests: 50, // Stricter in production
        },
      },
    },
  },
};
