/**
 * Test version of API Gateway for Swagger UI testing
 * Handles authentication, authorization, and routing to downstream services
 */
import Fastify from 'fastify';
import { randomUUID } from 'crypto';
import { swaggerOptions, swaggerUiOptions } from './config/swagger.js';
import * as schemas from './src/schemas/index.js';

// Configuration
const config = {
  port: process.env.GATEWAY_PORT || 3000,
  host: process.env.GATEWAY_HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret-for-swagger-demo',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  services: {
    comments: {
      url: process.env.COMMENTS_SERVICE_URL || 'http://localhost:3001',
      prefix: '/api/comments'
    },
    users: {
      url: process.env.USER_SERVICE_URL || 'http://localhost:3002', 
      prefix: '/api/users'
    },
    sahab: {
      url: process.env.SAHAB_SERVICE_URL || 'http://localhost:3003',
      prefix: '/api/sahab'
    }
  }
};

// Initialize Fastify
const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development' ? true : {
    level: process.env.LOG_LEVEL || 'info'
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
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.code === 'FST_JWT_BAD_REQUEST') {
    return reply.status(401).send({
      success: false,
      error: 'Invalid token format',
      timestamp: new Date().toISOString()
    });
  }

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: 'Validation failed',
      details: error.validation,
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
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

// Mock authentication middleware for testing
fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
    
    // Mock user for testing
    request.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: ['user'],
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    });
  }
});

// Mock admin authorization middleware  
fastify.decorate('requireAdmin', async function (request, reply) {
  if (!request.user.roles.includes('admin')) {
    return reply.status(403).send({
      success: false,
      error: 'Admin access required',
      timestamp: new Date().toISOString()
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
    service: 'Fastify API Gateway (Test Mode)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    services: {
      database: 'disabled',
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
    message: 'Welcome to the Fastify API Gateway (Test Mode)',
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
      sahab: `${config.services.sahab.url}${config.services.sahab.prefix}`
    },
    note: "This is a test version for Swagger UI demonstration"
  };
});

// Mock login endpoint for testing
fastify.post('/auth/login', {
  schema: {
    description: 'Authenticate user and receive JWT token (TEST MODE)',
    tags: ['Authentication'],
    body: schemas.userLogin,
    response: {
      200: schemas.authSuccessResponse,
      401: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
}, async (request, reply) => {
  const { email, password } = request.body;

  // Mock authentication - accept any credentials for testing
  if (!email || !password) {
    return reply.status(401).send({
      success: false,
      error: 'Email and password are required',
      timestamp: new Date().toISOString()
    });
  }

  const mockUser = {
    id: 'test-user-' + randomUUID(),
    email: email,
    firstName: 'Test',
    lastName: 'User',
    roles: email.includes('admin') ? ['admin', 'user'] : ['user'],
    isActive: true,
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const token = fastify.jwt.sign({ 
    id: mockUser.id, 
    email: mockUser.email, 
    roles: mockUser.roles
  });

  return {
    success: true,
    token,
    data: mockUser,
    meta: {
      timestamp: new Date().toISOString(),
      service: 'gateway-auth-test',
      version: '2.0.0'
    }
  };
});

// Mock register endpoint
fastify.post('/auth/register', {
  schema: {
    description: 'Register a new user account (TEST MODE)',
    tags: ['Authentication'],
    body: schemas.userRegistration,
    response: {
      201: schemas.userCreationResponse,
      400: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: { type: 'string' },
          details: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      409: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
}, async (request, reply) => {
  const { email, password, firstName, lastName } = request.body;

  const mockUser = {
    id: 'test-user-' + randomUUID(),
    email,
    firstName,
    lastName,
    roles: ['user'],
    isActive: true,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return reply.status(201).send({
    success: true,
    message: 'User registered successfully (TEST MODE)',
    data: mockUser,
    meta: {
      timestamp: new Date().toISOString(),
      service: 'gateway-auth-test',
      version: '2.0.0'
    }
  });
});

// Profile endpoint
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
      401: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
}, async request => {
  return { 
    success: true, 
    data: request.user,
    meta: {
      timestamp: new Date().toISOString(),
      service: 'gateway-auth-test',
      version: '2.0.0'
    }
  };
});

// Start the gateway
async function startGateway() {
  try {
    const address = await fastify.listen({
      port: config.port,
      host: config.host,
    });
    
    fastify.log.info(`🚀 Gateway TEST server is running at ${address}`);
    fastify.log.info(`📝 Swagger UI available at: ${address}/docs`);
    fastify.log.info(`🔗 Service endpoints:`, config.services);
    fastify.log.info(`⚠️  NOTE: This is a TEST version with mocked authentication`);
    
    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Start the test gateway
startGateway();

export default fastify;