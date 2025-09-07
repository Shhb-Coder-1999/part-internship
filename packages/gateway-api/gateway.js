/**
 * API Gateway with Microservice Proxying
 * Modular Fastify-based gateway with clean separation of concerns
 */

import Fastify from 'fastify';
import { swaggerOptions, swaggerUiOptions } from './config/swagger.js';
import { gatewayConfig } from './config/fastify.config.js';
import { createAuthMiddleware } from './src/middleware/auth.middleware.js';
import { ServiceRouter } from './src/utils/service-router.js';

// Route modules
import { coreRoutes } from './src/routes/core.routes.js';
import { authRoutes } from './src/routes/auth.routes.js';
import { adminRoutes } from './src/routes/admin.routes.js';
import { usersRoutes } from './src/routes/users.routes.js';

// Initialize Fastify
const fastify = Fastify({
  logger: gatewayConfig.logging.level === 'development'
    ? true
    : {
        level: gatewayConfig.logging.level,
        transport: gatewayConfig.logging.transport
      }
});

// Global error handler
fastify.setErrorHandler(async (error, request, reply) => {
  fastify.log.error(error);

  // JWT specific errors
  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    return reply.status(401).send({
      success: false,
      error: 'Authorization header missing',
      timestamp: new Date().toISOString(),
    });
  }

  if (error.code === 'FST_JWT_BAD_REQUEST') {
    return reply.status(401).send({
      success: false,
      error: 'Invalid token format',
      timestamp: new Date().toISOString(),
    });
  }

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: 'Validation failed',
      details: error.validation,
      timestamp: new Date().toISOString(),
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Register core plugins
await registerPlugins();

// Initialize database and authentication
await initializeServices();

// Register all routes
await registerRoutes();

// Start the gateway
async function startGateway() {
  try {
    const address = await fastify.listen({
      port: gatewayConfig.server.port,
      host: gatewayConfig.server.host,
    });

    fastify.log.info(`🚀 Gateway server is running at ${address}`);
    fastify.log.info(`📋 Service endpoints:`, gatewayConfig.services);

    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Plugin registration
async function registerPlugins() {
  // Core plugins
  await fastify.register(import('@fastify/sensible'));
  await fastify.register(import('@fastify/cors'), gatewayConfig.cors);
  await fastify.register(import('@fastify/helmet'), gatewayConfig.security.helmet);
  await fastify.register(import('@fastify/rate-limit'), gatewayConfig.rateLimit);

  // JWT plugin
  await fastify.register(import('@fastify/jwt'), {
    secret: gatewayConfig.jwt.secret
  });

  // Swagger documentation
  if (gatewayConfig.features.enableSwagger) {
    await fastify.register(import('@fastify/swagger'), swaggerOptions);
    await fastify.register(import('@fastify/swagger-ui'), swaggerUiOptions);
  }
}

// Service initialization
async function initializeServices() {
  try {
    fastify.log.info('🗄️ Initializing gateway database...');

    // Initialize database
    const { db } = await import('./database/client.js');
    await db.connect();
    fastify.decorate('prisma', db.getClient());

    // Verify connection
    const userCount = await fastify.prisma.user.count();
    fastify.log.info(`📊 Database ready with ${userCount} users`);

    // Clean up expired tokens
    const { UserService } = await import('./database/userService.js');
    const userService = new UserService();
    await userService.cleanExpiredTokens();

    // Initialize authentication middleware
    createAuthMiddleware(fastify);

    fastify.log.info('✅ Services initialized successfully');
  } catch (error) {
    fastify.log.error('❌ Service initialization failed:', error.message);
    throw error;
  }
}

// Route registration
async function registerRoutes() {
  // Register core routes (health, info)
  await fastify.register(coreRoutes);

  // Register authentication routes
  await fastify.register(authRoutes, { prefix: '/auth' });

  // Register admin routes
  await fastify.register(adminRoutes, { prefix: '/admin' });

  // Register user routes
  await fastify.register(usersRoutes, { prefix: '/api/users' });

  // Register service proxies
  const serviceRouter = new ServiceRouter(fastify);
  await serviceRouter.registerAllServices();

  fastify.log.info('✅ All routes registered successfully');
}

// For testing purposes
if (process.env.NODE_ENV !== 'test') {
  startGateway();
}

export default fastify;