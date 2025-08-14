/**
 * Fastify-based Comments API Server
 * High-performance comments service with JSON Schema validation
 */

import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createAppLogger } from '@shared/core/utils';
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

  // Sensible defaults (error handling, etc.)
  await fastify.register(import('@fastify/sensible'));

  // Swagger documentation
  await fastify.register(import('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Comments API',
        description: 'High-performance comments service built with Fastify',
        version: '2.0.0'
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server'
        }
      ],
      components: {
        schemas: {
          Comment: {
            type: 'object',
            required: ['id', 'text', 'createdAt', 'updatedAt'],
            properties: {
              id: { type: 'string', description: 'Comment ID' },
              text: { type: 'string', minLength: 1, maxLength: 1000, description: 'Comment text' },
              parentId: { type: 'string', nullable: true, description: 'Parent comment ID for replies' },
              likes: { type: 'integer', minimum: 0, description: 'Number of likes' },
              dislikes: { type: 'integer', minimum: 0, description: 'Number of dislikes' },
              createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
              updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
              deletedAt: { type: 'string', format: 'date-time', nullable: true, description: 'Deletion timestamp' }
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
        }
      },
      tags: [
        { name: 'Comments', description: 'Comment operations' },
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
      message: 'Comments API Server is running',
      timestamp: new Date().toISOString(),
      service: 'comments',
      version: '2.0.0'
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
      message: 'Comments API Server',
      version: '2.0.0',
      framework: 'Fastify',
      documentation: '/api-docs',
      endpoints: {
        health: 'GET /health',
        comments: {
          getAll: 'GET /api/comments',
          create: 'POST /api/comments',
          getById: 'GET /api/comments/:id',
          update: 'PATCH /api/comments/:id',
          delete: 'DELETE /api/comments/:id',
          like: 'POST /api/comments/:id/like',
          dislike: 'POST /api/comments/:id/dislike',
          search: 'GET /api/comments/search',
          stats: 'GET /api/comments/stats'
        }
      }
    };
  });

  // Register comments routes
  const commentsRoutes = await import('./src/routes/comments.js');
  await fastify.register(commentsRoutes.default, { prefix: '/api/comments' });
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
    
    fastify.log.info(`🚀 Fastify Comments API v2.0.0 running on port ${PORT}`);
    fastify.log.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
    fastify.log.info(`🔍 Health Check: http://localhost:${PORT}/health`);
    fastify.log.info(`💬 Comments API: http://localhost:${PORT}/api/comments`);

    console.log(`🚀 Fastify Comments API Server is running on http://localhost:${PORT}`);
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