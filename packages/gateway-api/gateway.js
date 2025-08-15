/**
 * API Gateway with Microservice Proxying
 * Handles authentication, authorization, and routing to downstream services
 */
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { swaggerOptions, swaggerUiOptions } from './config/swagger.js';
import * as schemas from './src/schemas/index.js';

// Configuration
const config = {
  port: process.env.GATEWAY_PORT || 3000,
  host: process.env.GATEWAY_HOST || '0.0.0.0',
  jwtSecret:
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  services: {
    comments: {
      url: process.env.COMMENTS_SERVICE_URL || 'http://localhost:3001',
      prefix: '/api/comments',
    },
    users: {
      url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
      prefix: '/api/users',
    },
    sahab: {
      url: process.env.SAHAB_SERVICE_URL || 'http://localhost:3003',
      prefix: '/api/sahab',
    },
  },
};

// Initialize Fastify
const fastify = Fastify({
  logger:
    process.env.NODE_ENV === 'development'
      ? true
      : {
          level: process.env.LOG_LEVEL || 'info',
        },
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
await fastify.register(import('@fastify/sensible'));

await fastify.register(import('@fastify/cors'), {
  origin: (origin, callback) => {
    const hostname = new URL(origin || 'http://localhost').hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || !origin) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed'), false);
  },
  credentials: true,
});

await fastify.register(import('@fastify/helmet'), {
  contentSecurityPolicy: false,
});

await fastify.register(import('@fastify/rate-limit'), {
  max: 1000,
  timeWindow: '1 minute',
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
});

await fastify.register(import('@fastify/jwt'), {
  secret: config.jwtSecret,
  sign: {
    expiresIn: config.jwtExpiration,
  },
});

// Register Swagger for API documentation
await fastify.register(import('@fastify/swagger'), swaggerOptions);
await fastify.register(import('@fastify/swagger-ui'), swaggerUiOptions);

// Service proxy helper
async function proxyToService(request, reply, serviceConfig) {
  try {
    // Add user context to headers for downstream services
    const headers = { ...request.headers };

    if (request.user) {
      headers['x-user-id'] = request.user.id;
      headers['x-user-email'] = request.user.email;
      headers['x-user-roles'] = JSON.stringify(request.user.roles);
      headers['x-gateway-forwarded'] = 'true';
    }

    // Add request ID for tracing
    headers['x-request-id'] = request.id || randomUUID();
    headers['x-gateway-version'] = '2.0.0';

    // Remove authorization header as we forward user context instead
    delete headers.authorization;
    delete headers.host;

    // Construct target URL
    const targetPath = request.url.replace(serviceConfig.prefix, '');
    const targetUrl = `${serviceConfig.url}${targetPath}`;

    fastify.log.info(
      `Proxying ${request.method} ${request.url} -> ${targetUrl}`
    );

    // Make HTTP request to target service
    const targetResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method)
        ? undefined
        : JSON.stringify(request.body),
    });

    // Copy response headers
    for (const [key, value] of targetResponse.headers.entries()) {
      reply.header(key, value);
    }

    // Stream response
    const responseBody = await targetResponse.text();

    reply.status(targetResponse.status);

    // Try to parse as JSON, otherwise return as text
    try {
      const jsonBody = JSON.parse(responseBody);
      return jsonBody;
    } catch {
      return responseBody;
    }
  } catch (error) {
    fastify.log.error(`Service proxy error: ${error.message}`);
    return reply.status(500).send({
      success: false,
      error: 'Service temporarily unavailable',
      timestamp: new Date().toISOString(),
    });
  }
}

// Initialize database connection
let prisma;

async function initializeDatabase() {
  try {
    fastify.log.info('🗄️ Initializing gateway database...');

    const { db } = await import('./database/client.js');
    await db.connect();

    prisma = db.getClient();

    // Verify connection
    const userCount = await prisma.user.count();
    fastify.log.info(`📊 Database ready with ${userCount} users`);

    // Clean up expired tokens
    const { UserService } = await import('./database/userService.js');
    const userService = new UserService();
    await userService.cleanExpiredTokens();
  } catch (error) {
    fastify.log.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

// Authentication middleware
fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();

    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({
        success: false,
        error: 'User not found or inactive',
        timestamp: new Date().toISOString(),
      });
    }

    // Enhance user object with roles
    request.user = {
      ...user,
      roles: user.roles.map(ur => ur.role.name),
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString(),
    });
  }
});

// Admin authorization middleware
fastify.decorate('requireAdmin', async function (request, reply) {
  if (!request.user.roles.includes('admin')) {
    return reply.status(403).send({
      success: false,
      error: 'Admin access required',
      timestamp: new Date().toISOString(),
    });
  }
});

// Gateway Routes

// Health check
fastify.get('/health', {
  schema: {
    description: 'Health check endpoint for monitoring gateway status',
    tags: ['Gateway'],
    response: {
      200: schemas.healthResponse
    }
  }
}, async (request, reply) => {
  return {
    status: 'OK',
    service: 'Fastify API Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    services: {
      database: 'connected',
      comments: 'proxied',
      users: 'proxied',
      sahab: 'proxied'
    }
  };
});

// Gateway info
fastify.get('/', {
  schema: {
    description: 'Gateway information and available services',
    tags: ['Gateway'],
    response: {
      200: schemas.gatewayInfoResponse
    }
  }
}, async (request, reply) => {
  return {
    message: 'Welcome to the Fastify API Gateway',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    authentication: {
      enabled: true,
      type: 'JWT'
    },
    services: {
      comments: `${config.services.comments.url}${config.services.comments.prefix}`,
      users: `${config.services.users.url}${config.services.users.prefix}`,
      sahab: `${config.services.sahab.url}${config.services.sahab.prefix}`,
    },
  };
});

// Authentication Routes (handled directly by gateway)

// Register
fastify.post('/auth/register', {
  schema: {
    description: 'Register a new user account',
    tags: ['Authentication'],
    body: schemas.userRegistration,
    response: {
      201: schemas.userCreationResponse,
      400: { $ref: '#/components/responses/ValidationError' },
      409: { $ref: '#/components/responses/ConflictError' }
    }
  }
}, async (request, reply) => {
  const { email, password, firstName, lastName } = request.body;

  try {
    const userService = (await import('./database/userService.js')).UserService;
    const service = new userService();

    // Create new user
    const newUser = await service.createUser({
      email,
      password,
      firstName,
      lastName,
    });

    return reply.status(201).send({
      success: true,
      message: 'User registered successfully',
      data: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        isActive: newUser.isActive,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        roles: newUser.roles || ['user']
      },
      meta: {
        timestamp: new Date().toISOString(),
        service: 'gateway-auth',
        version: '2.0.0',
      },
    });
  } catch (error) {
    request.log.error(error);

    if (error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return reply.status(400).send({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Login
fastify.post('/auth/login', {
  schema: {
    description: 'Authenticate user and receive JWT token',
    tags: ['Authentication'],
    body: schemas.userLogin,
    response: {
      200: schemas.authSuccessResponse,
      401: { $ref: '#/components/responses/UnauthorizedError' }
    }
  }
}, async (request, reply) => {
  const { email, password } = request.body;

  try {
    const userService = (await import('./database/userService.js')).UserService;
    const service = new userService();

    const user = await service.authenticateUser(email, password);

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      });
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      roles: user.roles || ['user'],
    });

    return {
      success: true,
      token,
      data: {
        id: user.id,
        email: user.email,
        roles: user.roles || ['user'],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isActive: user.isActive,
        isVerified: user.isVerified,
        meta: user.meta,
      },
      meta: {
        timestamp: new Date().toISOString(),
        service: 'gateway-auth',
        version: '2.0.0',
      },
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(401).send({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Profile
fastify.get('/auth/profile', {
  preHandler: fastify.authenticate,
  schema: {
    description: 'Get current user profile information',
    tags: ['Authentication'],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: schemas.userBase,
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              service: { type: 'string', example: 'gateway-auth' },
              version: { type: 'string', example: '2.0.0' }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/UnauthorizedError' }
    }
  }
}, async request => {
  return { 
    success: true, 
    data: {
      id: request.user.id,
      email: request.user.email,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      roles: request.user.roles,
      isActive: request.user.isActive,
      isVerified: request.user.isVerified,
      createdAt: request.user.createdAt,
      updatedAt: request.user.updatedAt
    },
    meta: {
      timestamp: new Date().toISOString(),
      service: 'gateway-auth',
      version: '2.0.0'
    }
  };
});

// Refresh token
fastify.post('/auth/refresh', {
  preHandler: fastify.authenticate,
  schema: {
    description: 'Refresh JWT token with current user context',
    tags: ['Authentication'],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          token: { 
            type: 'string',
            description: 'New JWT access token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string', format: 'email' },
              roles: { type: 'array', items: { type: 'string' } }
            }
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              service: { type: 'string', example: 'gateway-auth' },
              version: { type: 'string', example: '2.0.0' }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/UnauthorizedError' }
    }
  }
}, async request => {
  const newToken = fastify.jwt.sign({
    id: request.user.id,
    email: request.user.email,
    roles: request.user.roles
  });
  
  return { 
    success: true, 
    token: newToken, 
    data: {
      id: request.user.id,
      email: request.user.email,
      roles: request.user.roles
    },
    meta: {
      timestamp: new Date().toISOString(),
      service: 'gateway-auth',
      version: '2.0.0'
    }
  };
});

// Admin user creation
fastify.post('/admin/users', {
  preHandler: [fastify.authenticate, fastify.requireAdmin],
  schema: {
    description: 'Create a new user (admin only)',
    tags: ['Admin'],
    security: [{ bearerAuth: [] }],
    body: schemas.adminUserCreation,
    response: {
      201: schemas.userCreationResponse,
      400: { $ref: '#/components/responses/ValidationError' },
      401: { $ref: '#/components/responses/UnauthorizedError' },
      403: { $ref: '#/components/responses/ForbiddenError' },
      409: { $ref: '#/components/responses/ConflictError' }
    }
  }
}, async (request, reply) => {
  const { email, password, firstName, lastName, isActive = true, isVerified = false, roles = ['user'] } = request.body;

  try {
    const userService = (await import('./database/userService.js')).UserService;
    const service = new userService();

    const newUser = await service.createUser({
      email,
      password,
      firstName,
      lastName,
      isActive,
      isVerified,
      roles
    });

    return reply.status(201).send({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        isActive: newUser.isActive,
        isVerified: newUser.isVerified,
        roles: newUser.roles,
        meta: newUser.meta,
      },
      meta: {
        timestamp: new Date().toISOString(),
        service: 'gateway-auth',
        version: '2.0.0',
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Admin user listing
fastify.get('/admin/users', {
  preHandler: [fastify.authenticate, fastify.requireAdmin],
  schema: {
    description: 'List all users with pagination (admin only)',
    tags: ['Admin'],
    security: [{ bearerAuth: [] }],
    querystring: schemas.userListQuery,
    response: {
      200: schemas.paginationResponse,
      401: { $ref: '#/components/responses/UnauthorizedError' },
      403: { $ref: '#/components/responses/ForbiddenError' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }
}, async (request, reply) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = request.query;
    
    const userService = (await import('./database/userService.js')).UserService;
    const service = new userService();
    
    const users = await service.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      order
    });

    return {
      success: true,
      users: users.data,
      pagination: users.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        service: 'gateway-auth',
        version: '2.0.0',
      },
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve users',
      timestamp: new Date().toISOString(),
    });
  }
});

// Service Proxy Routes

// Comments service proxy
fastify.register(async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  
  fastify.all('/api/comments', {
    schema: {
      description: 'Proxy to Comments microservice',
      tags: ['Proxy'],
      security: [{ bearerAuth: [] }],
      summary: 'Access comments service endpoints',
      response: {
        200: {
          description: 'Response from comments service',
          type: 'object'
        },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        500: {
          description: 'Service temporarily unavailable',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Service temporarily unavailable' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return proxyToService(request, reply, config.services.comments);
  });
  
  fastify.all('/api/comments/*', {
    schema: {
      description: 'Proxy to Comments microservice (wildcard paths)',
      tags: ['Proxy'],
      security: [{ bearerAuth: [] }],
      summary: 'Access specific comments service endpoints',
      response: {
        200: {
          description: 'Response from comments service',
          type: 'object'
        },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        500: {
          description: 'Service temporarily unavailable',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Service temporarily unavailable' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return proxyToService(request, reply, config.services.comments);
  });
});

// Users service proxy
fastify.register(async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  
  fastify.all('/api/users', {
    schema: {
      description: 'Proxy to Users microservice',
      tags: ['Proxy'],
      security: [{ bearerAuth: [] }],
      summary: 'Access users service endpoints',
      response: {
        200: {
          description: 'Response from users service',
          type: 'object'
        },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        500: {
          description: 'Service temporarily unavailable',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Service temporarily unavailable' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return proxyToService(request, reply, config.services.users);
  });
  
  fastify.all('/api/users/*', {
    schema: {
      description: 'Proxy to Users microservice (wildcard paths)',
      tags: ['Proxy'],
      security: [{ bearerAuth: [] }],
      summary: 'Access specific users service endpoints',
      response: {
        200: {
          description: 'Response from users service',
          type: 'object'
        },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        500: {
          description: 'Service temporarily unavailable',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Service temporarily unavailable' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return proxyToService(request, reply, config.services.users);
  });
});

// Sahab service proxy
fastify.register(async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  
  fastify.all('/api/sahab', {
    schema: {
      description: 'Proxy to Sahab microservice',
      tags: ['Proxy'],
      security: [{ bearerAuth: [] }],
      summary: 'Access sahab service endpoints',
      response: {
        200: {
          description: 'Response from sahab service',
          type: 'object'
        },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        500: {
          description: 'Service temporarily unavailable',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Service temporarily unavailable' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return proxyToService(request, reply, config.services.sahab);
  });
  
  fastify.all('/api/sahab/*', {
    schema: {
      description: 'Proxy to Sahab microservice (wildcard paths)',
      tags: ['Proxy'],
      security: [{ bearerAuth: [] }],
      summary: 'Access specific sahab service endpoints',
      response: {
        200: {
          description: 'Response from sahab service',
          type: 'object'
        },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        500: {
          description: 'Service temporarily unavailable',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Service temporarily unavailable' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return proxyToService(request, reply, config.services.sahab);
  });
});

// Start the gateway
async function startGateway() {
  try {
    await initializeDatabase();

    const address = await fastify.listen({
      port: config.port,
      host: config.host,
    });

    fastify.log.info(`🚀 Gateway server is running at ${address}`);
    fastify.log.info(`🔗 Service endpoints:`, config.services);

    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// For testing purposes
if (process.env.NODE_ENV !== 'test') {
  startGateway();
}

export default fastify;
