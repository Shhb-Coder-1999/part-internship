/**
 * Comments Service Server
 * Simplified Fastify server for comment management
 */

import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ENV_VARS, DEFAULTS } from './src/constants/index.js';

// Environment variables
const PORT = process.env[ENV_VARS.PORT] || DEFAULTS.PORT;
const HOST = process.env[ENV_VARS.HOST] || DEFAULTS.HOST;

// Create Fastify instance
const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development' ? true : {
    level: process.env.LOG_LEVEL || 'info'
  },
  trustProxy: true
});

// Initialize Prisma client
const prisma = new PrismaClient();
fastify.decorate('prisma', prisma);

// Error handlers
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: 'Validation failed',
      details: error.validation,
      statusCode: 400,
      timestamp: new Date().toISOString()
    });
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: 'Rate limit exceeded',
      message: error.message,
      statusCode: 429,
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: error.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    statusCode,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  return reply.status(404).send({
    success: false,
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString()
  });
});

// Register plugins
await fastify.register(import('@fastify/cors'), {
  origin: true,
  credentials: true
});

await fastify.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '15 minutes'
});

await fastify.register(import('@fastify/sensible'));

// Register Swagger
await fastify.register(import('@fastify/swagger'), {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Comments API',
      description: 'Simple and efficient comments service',
      version: '2.0.0'
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
});

await fastify.register(import('@fastify/swagger-ui'), {
  routePrefix: '/api-docs'
});

// Register auth plugin
const authPlugin = await import('./src/plugins/auth.js');
await fastify.register(authPlugin.default);

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
}, async () => {
  return {
    success: true,
    message: 'Comments API Server is running',
    timestamp: new Date().toISOString(),
    service: 'comments',
    version: '2.0.0'
  };
});

// API info
fastify.get('/', {
  schema: {
    description: 'API information',
    tags: ['System']
  }
}, async () => {
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
        update: 'PUT /api/comments/:id',
        delete: 'DELETE /api/comments/:id',
        like: 'POST /api/comments/:id/like',
        dislike: 'POST /api/comments/:id/dislike',
        search: 'GET /api/comments/search',
        stats: 'GET /api/comments/stats'
      }
    }
  };
});

// Register routes
const commentsRoutes = await import('./src/routes/comments.js');
await fastify.register(commentsRoutes.default, { prefix: '/api/comments' });

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`);
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
};

// Start server
async function start() {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    
    console.log(`🚀 Comments API Server is running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation at http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Cleanup on close
fastify.addHook('onClose', async () => {
  await prisma.$disconnect();
});

// Start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  start();
}

export default fastify;