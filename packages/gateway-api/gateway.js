/**
 * Modern Fastify API Gateway
 * High-performance, configuration-driven API gateway
 */

import Fastify from 'fastify';
import { gatewayConfig } from './config/fastify.config.js';
import { ServiceRouter } from './src/utils/service-router.js';
import { db } from './database/client.js';
import seedDatabase from './database/seed.js';

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
      required: [],
      properties: {
        NODE_ENV: { type: 'string', default: 'development' },
        GATEWAY_PORT: { type: 'integer', default: 3000 },
        JWT_SECRET: { type: 'string', default: 'fallback-secret-change-this' },
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
        const hasRole = requiredRoles.some(role =>
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

      try {
        // Use proper database authentication
        const userService = (await import('./database/userService.js'))
          .UserService;
        const service = new userService();

        const user = await service.verifyPassword(email, password);
        if (!user) {
          throw fastify.httpErrors.unauthorized('Invalid email or password');
        }

        // Generate JWT token with user data
        const tokenPayload = {
          id: user.id,
          email: user.email,
          roles: user.roles || ['user'],
        };

        const token = fastify.jwt.sign(tokenPayload);

        return {
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            roles: user.roles || ['user'],
          },
        };
      } catch (error) {
        request.log.error('Authentication error:', error);
        throw fastify.httpErrors.unauthorized('Authentication failed');
      }
    }
  );

  // User registration endpoint
  fastify.post(
    '/auth/register',
    {
      schema: {
        description: 'User registration',
        tags: ['authentication'],
        body: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            firstName: { type: 'string', minLength: 2 },
            lastName: { type: 'string', minLength: 2 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              user: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, firstName, lastName } = request.body;

      try {
        const userService = (await import('./database/userService.js'))
          .UserService;
        const service = new userService();

        // Create new user
        const newUser = await service.createUser({
          email,
          password,
          firstName,
          lastName,
        });

        console.log(
          'DEBUG: New user from service:',
          JSON.stringify(newUser, null, 2)
        );
        console.log('DEBUG: newUser type:', typeof newUser);
        console.log('DEBUG: newUser is null?', newUser === null);
        console.log('DEBUG: newUser is undefined?', newUser === undefined);

        if (newUser) {
          console.log('DEBUG: newUser.id:', newUser.id);
          console.log('DEBUG: newUser.email:', newUser.email);
          console.log('DEBUG: newUser.firstName:', newUser.firstName);
          console.log('DEBUG: newUser.lastName:', newUser.lastName);
          console.log('DEBUG: newUser.isActive:', newUser.isActive);
          console.log('DEBUG: newUser.isVerified:', newUser.isVerified);
          console.log('DEBUG: newUser.createdAt:', newUser.createdAt);
          console.log('DEBUG: newUser.updatedAt:', newUser.updatedAt);
          console.log('DEBUG: newUser.roles:', newUser.roles);
        } else {
          console.error('ERROR: newUser is falsy!');
        }

        // Test response construction
        const testUser = {
          id: newUser?.id || 'NO_ID',
          email: newUser?.email || 'NO_EMAIL',
          firstName: newUser?.firstName || 'NO_FIRST_NAME',
          lastName: newUser?.lastName || 'NO_LAST_NAME',
          isActive: newUser?.isActive || 'NO_IS_ACTIVE',
          isVerified: newUser?.isVerified || 'NO_IS_VERIFIED',
          createdAt: newUser?.createdAt || 'NO_CREATED_AT',
          updatedAt: newUser?.updatedAt || 'NO_UPDATED_AT',
          roles: newUser?.roles || 'NO_ROLES',
        };

        console.log(
          'DEBUG: Test user object:',
          JSON.stringify(testUser, null, 2)
        );

        return reply.status(201).send({
          success: true,
          message: 'User registered successfully',
          user: testUser,
        });
      } catch (error) {
        request.log.error('Registration error:', error);
        if (
          error.message.includes('already exists') ||
          error.message.includes('Unique constraint')
        ) {
          throw fastify.httpErrors.conflict(
            'User already exists with this email'
          );
        }
        throw fastify.httpErrors.badRequest(
          'Registration failed: ' + error.message
        );
      }
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
    async request => {
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
    async request => {
      const newToken = fastify.jwt.sign(request.user);
      return { success: true, token: newToken, user: request.user };
    }
  );
}

/**
 * Register user management routes (admin only)
 */
async function registerUserManagementRoutes() {
  // Create user endpoint (admin only)
  fastify.post(
    '/admin/users',
    {
      schema: {
        description: 'Create new user (admin only)',
        tags: ['admin', 'users'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            firstName: { type: 'string', minLength: 2 },
            lastName: { type: 'string', minLength: 2 },
            isActive: { type: 'boolean', default: true },
            isVerified: { type: 'boolean', default: false },
            roles: {
              type: 'array',
              items: { type: 'string' },
              default: ['user'],
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              user: { type: 'object' },
            },
          },
        },
      },
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request, reply) => {
      const userData = request.body;

      try {
        const userService = (await import('./database/userService.js'))
          .UserService;
        const service = new userService();

        const newUser = await service.createUser(userData);

        return reply.status(201).send({
          success: true,
          message: 'User created successfully',
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
            isActive: newUser.isActive,
            isVerified: newUser.isVerified,
            roles: newUser.roles,
          },
        });
      } catch (error) {
        request.log.error('User creation error:', error);
        if (
          error.message.includes('already exists') ||
          error.message.includes('Unique constraint')
        ) {
          throw fastify.httpErrors.conflict(
            'User already exists with this email'
          );
        }
        throw fastify.httpErrors.badRequest(
          'User creation failed: ' + error.message
        );
      }
    }
  );

  // List users endpoint (admin only)
  fastify.get(
    '/admin/users',
    {
      schema: {
        description: 'List all users (admin only)',
        tags: ['admin', 'users'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              users: { type: 'array' },
              pagination: { type: 'object' },
            },
          },
        },
      },
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async request => {
      const { page = 1, limit = 20 } = request.query;

      try {
        const userService = (await import('./database/userService.js'))
          .UserService;
        const service = new userService();

        const result = await service.getAllUsers(page, limit);

        return {
          success: true,
          users: result.users,
          pagination: result.pagination,
        };
      } catch (error) {
        request.log.error('User listing error:', error);
        throw fastify.httpErrors.internalServerError('Failed to list users');
      }
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
          register: '/auth/register',
          profile: '/auth/profile',
          refresh: '/auth/refresh',
        },
      },
      admin: {
        endpoints: {
          createUser: '/admin/users',
          listUsers: '/admin/users',
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
 * Initialize database
 */
async function initializeDatabase() {
  try {
    fastify.log.info('🗄️ Initializing gateway database...');

    // Connect to database
    await db.connect();

    // Check if database needs seeding
    const prisma = db.getClient();
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      fastify.log.info('🌱 Database is empty, please run seed script manually');
      fastify.log.info(
        '📝 Run: node --loader @swc-node/register database/simple-seed.js'
      );
    } else {
      fastify.log.info(`📊 Database ready with ${userCount} users`);
    }

    // Clean expired tokens
    const userService = (await import('./database/userService.js')).UserService;
    const service = new userService();
    const cleaned = await service.cleanExpiredTokens();
    if (cleaned > 0) {
      fastify.log.info(`🧹 Cleaned ${cleaned} expired tokens`);
    }
  } catch (error) {
    fastify.log.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Start the gateway
 */
async function startGateway() {
  try {
    // Initialize database first
    await initializeDatabase();

    // Register all components
    await registerCorePlugins();
    registerDecorators();
    await registerAuthRoutes();
    await registerUserManagementRoutes();
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
const gracefulShutdown = async signal => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`);

  try {
    // Close database connection
    await db.disconnect();

    // Close Fastify server
    await fastify.close();

    fastify.log.info('✅ Gateway shutdown complete');
  } catch (error) {
    fastify.log.error('❌ Error during shutdown:', error);
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the gateway
startGateway();

export default fastify;
