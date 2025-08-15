/**
 * Fastify Gateway Configuration
 * Centralized configuration for the Fastify-based API Gateway
 */

export const gatewayConfig = {
  // Server configuration
  server: {
    port: process.env.GATEWAY_PORT || 8080,
    host: '0.0.0.0',
    trustProxy: true,
    bodyLimit: parseInt(process.env.MAX_REQUEST_SIZE) || 10485760, // 10MB
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 30000,
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT) || 10000,
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-this',
    expiration: process.env.JWT_EXPIRATION || '24h',
  },

  // Rate limiting configuration
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
    hook: 'preHandler',
    keyGenerator: (request) => request.ip || 'anonymous',
  },

  // CORS configuration
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:8080',
          ];

      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV === 'development'
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  },

  // Security configuration
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    },
  },

  // Service discovery configuration
  services: {
    recruitment: {
      comments: {
        url: process.env.COMMENTS_SERVICE_URL || 'http://localhost:3101',
        prefix: '/part/recruitment/comments',
        rewritePrefix: '/api/comments',
        auth: 'required', // Now requires JWT authentication
        roles: ['user', 'admin'],
      },
      users: {
        url: process.env.USER_MANAGEMENT_SERVICE_URL || 'http://localhost:3103',
        prefix: '/part/recruitment/users',
        rewritePrefix: '/api/users',
        auth: 'required', // Now requires JWT authentication
        roles: ['user', 'admin'],
      },
      sahab: {
        url: process.env.SAHAB_SERVICE_URL || 'http://localhost:3102',
        prefix: '/part/recruitment/sahab',
        rewritePrefix: '/',
        auth: 'required', // Now requires JWT authentication
        roles: ['user', 'admin'],
      },
    },
    college: {
      url: process.env.COLLEGE_SERVICE_URL || 'http://localhost:3004',
      prefix: '/part/college',
      rewritePrefix: '',
      auth: 'required',
      roles: ['student', 'teacher', 'admin'],
      status: 'planned', // 'active', 'planned', 'deprecated'
    },
    internship: {
      url: process.env.INTERNSHIP_SERVICE_URL || 'http://localhost:3005',
      prefix: '/part/internship',
      rewritePrefix: '',
      auth: 'required',
      roles: ['intern', 'supervisor', 'admin'],
      status: 'planned',
    },
  },

  // Swagger/OpenAPI configuration
  swagger: {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Part Internship API Gateway',
        description:
          'High-performance Fastify-based API Gateway for microservices architecture',
        version: '2.0.0',
        contact: {
          name: 'API Support',
          email: 'support@part-internship.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${process.env.GATEWAY_PORT || 8080}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'authentication', description: 'Authentication operations' },
        { name: 'health', description: 'Health check operations' },
        { name: 'recruitment', description: 'Recruitment service operations' },
        { name: 'college', description: 'College service operations' },
        { name: 'internship', description: 'Internship service operations' },
        { name: 'info', description: 'Gateway information' },
      ],
    },
  },

  // Feature flags
  features: {
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableTracing: process.env.ENABLE_TRACING === 'true',
  },

  // Demo users for development
  demoUsers:
    process.env.NODE_ENV === 'development'
      ? {
          'admin@example.com': {
            id: '1',
            email: 'admin@example.com',
            name: 'Admin User',
            password: 'admin123',
            roles: ['admin', 'user'],
          },
          'user@example.com': {
            id: '2',
            email: 'user@example.com',
            name: 'Regular User',
            password: 'user123',
            roles: ['user'],
          },
          'student@example.com': {
            id: '3',
            email: 'student@example.com',
            name: 'Student User',
            password: 'student123',
            roles: ['student', 'user'],
          },
          'teacher@example.com': {
            id: '4',
            email: 'teacher@example.com',
            name: 'Teacher User',
            password: 'teacher123',
            roles: ['teacher', 'user'],
          },
          'supervisor@example.com': {
            id: '5',
            email: 'supervisor@example.com',
            name: 'Supervisor User',
            password: 'supervisor123',
            roles: ['supervisor', 'user'],
          },
        }
      : {},
};

export default gatewayConfig;
