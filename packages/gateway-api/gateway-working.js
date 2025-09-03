/**
 * Working API Gateway with simplified authentication
 */
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

// Configuration
const config = {
  port: process.env.GATEWAY_PORT || 3000,
  host: process.env.GATEWAY_HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'development-secret-key',
  services: {
    comments: {
      url: process.env.COMMENTS_SERVICE_URL || 'http://localhost:3001',
      prefix: '/api/comments',
    },
  },
};

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Initialize database
const prisma = new PrismaClient();

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

await fastify.register(import('@fastify/jwt'), {
  secret: config.jwtSecret
});

// Basic authentication decorator  
fastify.decorate('authenticate', async function(request, reply) {
  try {
    // Skip authentication for health and docs
    if (['/health', '/', '/docs'].some(route => request.url.startsWith(route))) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Authorization required',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7);
    const decoded = fastify.jwt.verify(token);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString(),
      });
    }

    request.user = {
      ...user,
      roles: user.roles.map(ur => ur.role.name)
    };
    
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid token',
      timestamp: new Date().toISOString(),
    });
  }
});

// Basic routes
fastify.get('/health', async (request, reply) => {
  return {
    status: 'OK',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
  };
});

fastify.get('/', async (request, reply) => {
  return {
    message: 'Welcome to API Gateway',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  };
});

// Auth routes
fastify.post('/auth/register', async (request, reply) => {
  const { email, password, firstName, lastName } = request.body;

  try {
    const { passwordService } = await import('@shared/core/auth');
    const hashedPassword = await passwordService.hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isActive: true,
        isVerified: false,
      },
    });

    return reply.status(201).send({
      success: true,
      message: 'User registered successfully',
      data: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: 'User already exists',
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

fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      });
    }

    const { passwordService } = await import('@shared/core/auth');
    const isValid = await passwordService.verifyPassword(password, user.password);

    if (!isValid) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      });
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      roles: user.roles.map(ur => ur.role.name)
    });

    return {
      success: true,
      token,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(ur => ur.role.name)
      }
    };
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Profile endpoint
fastify.get('/auth/profile', {
  preHandler: fastify.authenticate
}, async request => {
  return { 
    success: true, 
    data: {
      id: request.user.id,
      email: request.user.email,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      roles: request.user.roles,
    }
  };
});

// Proxy to comments service
fastify.register(async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  
  fastify.all('/api/comments', async (request, reply) => {
    try {
      const headers = { 
        ...request.headers,
        'x-user-id': request.user.id,
        'x-user-email': request.user.email,
      };
      delete headers.authorization;
      
      const targetUrl = `${config.services.comments.url}/api/comments`;
      
      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body),
      });

      const responseBody = await response.text();
      reply.status(response.status);
      
      try {
        return JSON.parse(responseBody);
      } catch {
        return responseBody;
      }
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Service unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  });

  fastify.all('/api/comments/*', async (request, reply) => {
    try {
      const headers = { 
        ...request.headers,
        'x-user-id': request.user.id,
        'x-user-email': request.user.email,
      };
      delete headers.authorization;
      
      const targetPath = request.url.replace('/api/comments', '');
      const targetUrl = `${config.services.comments.url}/api/comments${targetPath}`;
      
      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body),
      });

      const responseBody = await response.text();
      reply.status(response.status);
      
      try {
        return JSON.parse(responseBody);
      } catch {
        return responseBody;
      }
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Service unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  });
});

// Start the gateway
async function startGateway() {
  try {
    const address = await fastify.listen({
      port: config.port,
      host: config.host,
    });

    fastify.log.info(`🚀 Gateway server is running at ${address}`);
    console.log(`🚀 Gateway server is running at ${address}`);
    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startGateway();
}

export default fastify;