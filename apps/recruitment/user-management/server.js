/**
 * Fastify-based User Management API Server
 * High-performance user management service with JSON Schema validation
 */

import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createAppLogger } from '../../../packages/shared/utils/index.js';
import { ENV_VARS, DEFAULTS, HTTP_STATUS } from './src/constants/index.js';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname'
      }
    } : undefined
  },
  trustProxy: true
});

// Environment variables
const PORT = process.env[ENV_VARS.PORT] || DEFAULTS.PORT;
const HOST = process.env[ENV_VARS.HOST] || DEFAULTS.HOST;

/**
 * Register core plugins
 */
async function registerCorePlugins() {
  // CORS support
  await fastify.register(import('@fastify/cors'), {
    origin: true,
    credentials: true
  });

  // Rate limiting
  await fastify.register(import('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '15 minutes',
    errorResponseBuilder: (request, context) => ({
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
      expiresIn: Math.round(context.ttl / 1000)
    })
  });

  // JWT support
  await fastify.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  });

  // Sensible defaults (error handling, etc.)
  await fastify.register(import('@fastify/sensible'));

  // Swagger documentation
  await fastify.register(import('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'User Management API',
        description: 'High-performance user management service built with Fastify',
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server'
        }
      ],
      components: {
        schemas: {
          User: {
            type: 'object',
            required: ['id', 'email', 'username', 'createdAt', 'updatedAt'],
            properties: {
              id: { type: 'string', description: 'User ID' },
              email: { type: 'string', format: 'email', description: 'User email' },
              username: { type: 'string', description: 'Username' },
              firstName: { type: 'string', description: 'First name' },
              lastName: { type: 'string', description: 'Last name' },
              phone: { type: 'string', description: 'Phone number' },
              avatar: { type: 'string', description: 'Avatar URL' },
              isActive: { type: 'boolean', description: 'Is user active' },
              isVerified: { type: 'boolean', description: 'Is user verified' },
              lastLoginAt: { type: 'string', format: 'date-time', nullable: true, description: 'Last login timestamp' },
              createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
              updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
            }
          },
          Role: {
            type: 'object',
            required: ['id', 'name', 'createdAt', 'updatedAt'],
            properties: {
              id: { type: 'string', description: 'Role ID' },
              name: { type: 'string', description: 'Role name' },
              description: { type: 'string', description: 'Role description' },
              permissions: { type: 'object', description: 'Role permissions' },
              isActive: { type: 'boolean', description: 'Is role active' },
              createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
              updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
            }
          },
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { oneOf: [{ type: 'object' }, { type: 'array' }, { type: 'null' }] },
              timestamp: { type: 'string', format: 'date-time' }
            }
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', enum: [false] },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      tags: [
        { name: 'Users', description: 'User management operations' },
        { name: 'Roles', description: 'Role management operations' },
        { name: 'Authentication', description: 'Authentication operations' },
        { name: 'System', description: 'System operations' }
      ]
    }
  });

  // Swagger UI
  await fastify.register(import('@fastify/swagger-ui'), {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true
  });
}

/**
 * Register routes
 */
async function registerRoutes() {
  // Health check
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' },
            version: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      success: true,
      message: 'User Management API Server is running',
      timestamp: new Date().toISOString(),
      service: 'user-management',
      version: '1.0.0'
    };
  });

  // API information
  fastify.get('/', {
    schema: {
      description: 'API information and available endpoints',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            version: { type: 'string' },
            framework: { type: 'string' },
            documentation: { type: 'string' },
            endpoints: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      message: 'User Management API Server',
      version: '1.0.0',
      framework: 'Fastify',
      documentation: '/api-docs',
      endpoints: {
        health: 'GET /health',
        users: {
          getAll: 'GET /api/users',
          create: 'POST /api/users',
          getById: 'GET /api/users/:id',
          update: 'PATCH /api/users/:id',
          delete: 'DELETE /api/users/:id',
          search: 'GET /api/users/search'
        },
        roles: {
          getAll: 'GET /api/roles',
          create: 'POST /api/roles',
          getById: 'GET /api/roles/:id',
          update: 'PATCH /api/roles/:id',
          delete: 'DELETE /api/roles/:id',
          assign: 'POST /api/roles/assign',
          revoke: 'DELETE /api/roles/revoke'
        },
        auth: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          profile: 'GET /api/auth/profile',
          changePassword: 'POST /api/auth/change-password'
        }
      }
    };
  });

  // Register user routes
  const usersRoutes = await import('./src/routes/users.js');
  await fastify.register(usersRoutes.default, { prefix: '/api/users' });
}

/**
 * Error handler
 */
function registerErrorHandlers() {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Validation errors
    if (error.validation) {
      reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: error.validation,
        statusCode: 400,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      reply.status(429).send({
        success: false,
        error: 'Rate limit exceeded',
        message: error.message,
        statusCode: 429,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // JWT errors
    if (error.code === 'FST_JWT_BAD_REQUEST' || error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token',
        statusCode: 401,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      success: false,
      error: error.name || 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      statusCode,
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * Start the server
 */
async function startServer() {
  try {
    // Register all components
    await registerCorePlugins();
    await registerRoutes();
    registerErrorHandlers();

    // Start server
    await fastify.listen({ port: PORT, host: HOST });
    
    fastify.log.info(`🚀 Fastify User Management API v1.0.0 running on port ${PORT}`);
    fastify.log.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
    fastify.log.info(`🔍 Health Check: http://localhost:${PORT}/health`);
    fastify.log.info(`👥 Users API: http://localhost:${PORT}/api/users`);

    console.log(`🚀 Fastify User Management API Server is running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation at http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`);
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

export default fastify;