/**
 * Modern Fastify API Gateway
 * High-performance, configuration-driven API gateway
 */

import Fastify from 'fastify';
import { gatewayConfig } from './config/fastify.config.js';
import { ServiceRouter } from './utils/service-router.js';

// Create Fastify instance with configuration
const fastify = Fastify({
  logger: gatewayConfig.logging,
  trustProxy: gatewayConfig.server.trustProxy,
  bodyLimit: gatewayConfig.server.bodyLimit,
  keepAliveTimeout: gatewayConfig.server.keepAliveTimeout,
  connectionTimeout: gatewayConfig.server.connectionTimeout,
});

/**
 * Register core plugins
 */
async function registerCorePlugins() {
  // Environment validation
  await fastify.register(import('@fastify/env'), {
    schema: {
      type: 'object',
      required: ['JWT_SECRET'],
      properties: {
        NODE_ENV: { type: 'string', default: 'development' },
        GATEWAY_PORT: { type: 'integer', default: 8080 },
        JWT_SECRET: { type: 'string' },
        JWT_EXPIRATION: { type: 'string', default: '24h' },
      },
    },
    dotenv: { path: './envs/.env' },
  });

  // Security headers
  await fastify.register(
    import('@fastify/helmet'),
    gatewayConfig.security.helmet
  );

  // CORS support
  await fastify.register(import('@fastify/cors'), gatewayConfig.cors);

  // Rate limiting
  await fastify.register(
    import('@fastify/rate-limit'),
    gatewayConfig.rateLimit
  );

  // JWT authentication
  await fastify.register(import('@fastify/jwt'), {
    secret: gatewayConfig.jwt.secret,
    sign: { expiresIn: gatewayConfig.jwt.expiration },
  });

  // Sensible defaults
  await fastify.register(import('@fastify/sensible'));

  // Swagger documentation
  if (gatewayConfig.features.enableSwagger) {
    await fastify.register(import('@fastify/swagger'), {
      openapi: gatewayConfig.swagger.openapi,
    });

    await fastify.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      staticCSP: true,
    });
  }
}

/**
 * Register authentication decorators
 */
function registerDecorators() {
  // Authentication decorator
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // Authorization decorator
  fastify.decorate('authorize', (requiredRoles = []) => {
    return async function (request, reply) {
      if (!request.user) {
        throw fastify.httpErrors.unauthorized('Authentication required');
      }

      if (requiredRoles.length > 0) {
        const hasRole = requiredRoles.some((role) =>
          request.user.roles?.includes(role)
        );

        if (!hasRole) {
          throw fastify.httpErrors.forbidden('Insufficient permissions');
        }
      }
    };
  });
}

/**
 * Register authentication routes
 */
async function registerAuthRoutes() {
  fastify.post(
    '/auth/login',
    {
      schema: {
        description: 'User authentication',
        tags: ['authentication'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              token: { type: 'string' },
              user: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const user = gatewayConfig.demoUsers[email];

      if (!user || user.password !== password) {
        throw fastify.httpErrors.unauthorized('Invalid credentials');
      }

      const { password: _, ...userWithoutPassword } = user;
      const token = fastify.jwt.sign(userWithoutPassword);

      return { success: true, token, user: userWithoutPassword };
    }
  );

  fastify.get(
    '/auth/profile',
    {
      schema: {
        description: 'Get user profile',
        tags: ['authentication'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: fastify.authenticate,
    },
    async (request) => {
      return { success: true, user: request.user };
    }
  );

  fastify.post(
    '/auth/refresh',
    {
      schema: {
        description: 'Refresh JWT token',
        tags: ['authentication'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: fastify.authenticate,
    },
    async (request) => {
      const newToken = fastify.jwt.sign(request.user);
      return { success: true, token: newToken, user: request.user };
    }
  );
}

/**
 * Register health check routes
 */
async function registerHealthRoutes() {
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Gateway health check',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
              version: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'OK',
      service: 'Fastify API Gateway',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    })
  );
}

/**
 * Register root route
 */
async function registerRootRoute() {
  fastify.get(
    '/',
    {
      schema: {
        description: 'Gateway information and API overview',
        tags: ['info'],
      },
    },
    async () => ({
      message: 'Part Internship API Gateway',
      version: '2.0.0',
      framework: 'Fastify',
      environment: process.env.NODE_ENV,
      documentation: gatewayConfig.features.enableSwagger
        ? '/docs'
        : 'disabled',
      authentication: {
        enabled: true,
        endpoints: {
          login: '/auth/login',
          profile: '/auth/profile',
          refresh: '/auth/refresh',
        },
      },
      services: Object.keys(gatewayConfig.services),
      serviceDiscovery: '/services',
      healthCheck: '/health',
      demoCredentials:
        process.env.NODE_ENV === 'development'
          ? {
              admin: { email: 'admin@example.com', password: 'admin123' },
              user: { email: 'user@example.com', password: 'user123' },
              student: { email: 'student@example.com', password: 'student123' },
              teacher: { email: 'teacher@example.com', password: 'teacher123' },
              supervisor: {
                email: 'supervisor@example.com',
                password: 'supervisor123',
              },
            }
          : undefined,
    })
  );
}

/**
 * Register error handlers
 */
function registerErrorHandlers() {
  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // JWT errors
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing authorization header',
        statusCode: 401,
      });
    }

    if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token',
        statusCode: 401,
      });
    }

    // Validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.validation,
        statusCode: 400,
      });
    }

    // Default error
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: error.name || 'Internal Server Error',
      message:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Something went wrong',
      statusCode,
    });
  });

  // Not found handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    });
  });
}

/**
 * Start the gateway
 */
async function startGateway() {
  try {
    // Register all components
    await registerCorePlugins();
    registerDecorators();
    await registerAuthRoutes();
    await registerHealthRoutes();
    await registerRootRoute();

    // Register service routes
    const serviceRouter = new ServiceRouter(fastify);
    await serviceRouter.registerAllServices();
    await serviceRouter.registerServiceHealthChecks();
    await serviceRouter.registerServiceDiscovery();

    registerErrorHandlers();

    // Start server
    const port = gatewayConfig.server.port;
    const host = gatewayConfig.server.host;

    await fastify.listen({ port, host });

    fastify.log.info(`🚪 Fastify API Gateway v2.0.0 running on port ${port}`);
    fastify.log.info(`📖 API Documentation: http://localhost:${port}/docs`);
    fastify.log.info(`🔍 Health Check: http://localhost:${port}/health`);
    fastify.log.info(`🔍 Service Discovery: http://localhost:${port}/services`);

    // Log service endpoints
    for (const [category, services] of Object.entries(gatewayConfig.services)) {
      if (typeof services === 'object' && services.prefix) {
        fastify.log.info(
          `   📊 ${category}: http://localhost:${port}${services.prefix}`
        );
      } else {
        for (const [serviceName, serviceConfig] of Object.entries(services)) {
          fastify.log.info(
            `   📊 ${category}/${serviceName}: http://localhost:${port}${serviceConfig.prefix}`
          );
        }
      }
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the gateway
startGateway();

export default fastify;
