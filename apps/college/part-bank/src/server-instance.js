/**
 * Fastify Server Instance Configuration
 */

import Fastify from 'fastify';
import { prismaClient } from '#app/clients';
import { createAuthMiddleware, createErrorHandler, createRateLimitMiddleware } from '#app/middleware';
import { authRoutes, depositAccountRoutes, transactionRoutes, healthRoutes } from '#app/routes';
import { ENV_VARS, DEFAULTS } from '#app/constants';

/**
 * Create and configure Fastify server instance
 */
export async function createFastifyServer() {
  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: process.env[ENV_VARS.LOG_LEVEL] || DEFAULTS.LOG_LEVEL
    },
    disableRequestLogging: process.env.NODE_ENV === 'production',
    trustProxy: true
  });

  // Register database client
  fastify.decorate('prisma', prismaClient);

  // Register rate limiting configurations
  const rateLimitConfigs = createRateLimitMiddleware();
  fastify.decorate('rateLimitConfig', rateLimitConfigs);

  // Register Fastify plugins
  await registerPlugins(fastify);

  // Register middleware
  registerMiddleware(fastify);

  // Register routes
  await registerRoutes(fastify);

  return fastify;
}

/**
 * Register Fastify plugins
 */
async function registerPlugins(fastify) {
  // CORS plugin
  await fastify.register(import('@fastify/cors'), {
    origin: process.env[ENV_VARS.CORS_ORIGIN] || DEFAULTS.CORS_ORIGIN,
    methods: (process.env[ENV_VARS.CORS_METHODS] || DEFAULTS.CORS_METHODS).split(','),
    credentials: true
  });

  // Security headers
  await fastify.register(import('@fastify/helmet'), {
    contentSecurityPolicy: false // Disable CSP for API
  });

  // Request parsing
  await fastify.register(import('@fastify/sensible'));

  // Multipart form data support (for file uploads)
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: parseInt(process.env[ENV_VARS.MAX_FILE_SIZE]) || DEFAULTS.MAX_FILE_SIZE,
      files: 1
    }
  });

  // Rate limiting (base registration)
  await fastify.register(import('@fastify/rate-limit'), {
    global: false, // We'll apply specific configs per route
    ...rateLimitConfigs.general
  });

  // Swagger documentation
  await fastify.register(import('@fastify/swagger'), {
    swagger: {
      info: {
        title: process.env[ENV_VARS.API_TITLE] || DEFAULTS.API_TITLE,
        description: process.env[ENV_VARS.API_DESCRIPTION] || DEFAULTS.API_DESCRIPTION,
        version: process.env[ENV_VARS.API_VERSION] || DEFAULTS.API_VERSION
      },
      externalDocs: {
        url: 'https://swagger.io',
        description: 'Find more info here'
      },
      host: process.env.NODE_ENV === 'production' ? undefined : `localhost:${process.env[ENV_VARS.PORT] || DEFAULTS.PORT}`,
      schemes: process.env.NODE_ENV === 'production' ? ['https'] : ['http'],
      consumes: ['application/json', 'multipart/form-data'],
      produces: ['application/json'],
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Enter: Bearer <token>'
        }
      }
    }
  });

  // Swagger UI
  await fastify.register(import('@fastify/swagger-ui'), {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true
  });
}

/**
 * Register middleware
 */
function registerMiddleware(fastify) {
  // Error handling
  createErrorHandler(fastify);

  // Authentication middleware
  createAuthMiddleware(fastify);

  // Request ID and logging
  fastify.addHook('onRequest', async (request, reply) => {
    request.id = request.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    request.log = fastify.log.child({ reqId: request.id });
  });

  // Response time tracking
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    const responseTime = Date.now() - request.startTime;
    reply.header('X-Response-Time', `${responseTime}ms`);
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTime}ms`
    }, 'Request completed');
  });
}

/**
 * Register application routes
 */
async function registerRoutes(fastify) {
  // Health routes (no prefix)
  await fastify.register(healthRoutes);

  // API routes with prefix
  await fastify.register(async function (fastify) {
    // Authentication routes
    await fastify.register(authRoutes, { prefix: '/auth' });

    // Deposit account routes
    await fastify.register(depositAccountRoutes, { prefix: '/deposit-account' });

    // Transaction routes
    await fastify.register(transactionRoutes, { prefix: '/transactions' });
  }, { prefix: '/api' });

  // Root route
  fastify.get('/', {
    schema: {
      description: 'API root endpoint',
      tags: ['Root'],
      response: {
        200: {
          type: 'object',
          properties: {
            service: { type: 'string' },
            version: { type: 'string' },
            description: { type: 'string' },
            documentation: { type: 'string' },
            health: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      service: 'Part Bank API',
      version: '1.0.0',
      description: 'Minimal banking-style API with user auth, deposit accounts, and transaction feed',
      documentation: `${request.protocol}://${request.hostname}:${process.env[ENV_VARS.PORT] || DEFAULTS.PORT}/api-docs`,
      health: `${request.protocol}://${request.hostname}:${process.env[ENV_VARS.PORT] || DEFAULTS.PORT}/health`
    };
  });
}

export default createFastifyServer;