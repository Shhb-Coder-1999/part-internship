import Fastify from 'fastify';
import { 
  extractUserContext, 
  requireAuth, 
  getUserContext,
  isAdmin 
} from '../../../packages/shared/auth/index.js';

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

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

// In-memory storage for Sahab data (replace with database in production)
let sahabData = [];
let nextId = 1;

/**
 * Register core plugins
 */
async function registerCorePlugins() {
  // CORS support
  await fastify.register(import('@fastify/cors'), {
    origin: true,
    credentials: true
  });

  // Sensible defaults
  await fastify.register(import('@fastify/sensible'));
}

/**
 * Register routes with JWT authentication
 */
async function registerRoutes() {
  // Register user context middleware for all routes
  fastify.addHook('preHandler', extractUserContext);

  // Health check endpoint (public)
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      status: 'success',
      message: 'Sahab API Server is running',
      timestamp: new Date().toISOString()
    };
  });

  // Root endpoint (public)
  fastify.get('/', {
    schema: {
      description: 'API information',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            version: { type: 'string' },
            status: { type: 'string' },
            endpoints: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      message: 'Sahab API Server with JWT Authentication',
      version: '1.0.0',
      status: '✅ Production Ready',
      framework: 'Fastify',
      authentication: 'JWT Required',
      endpoints: {
        health: 'GET /health',
        data: 'GET /data (JWT Required)',
        create: 'POST /data (JWT Required)',
        update: 'PUT /data/:id (JWT Required)',
        delete: 'DELETE /data/:id (JWT Required)'
      }
    };
  });

  // Get user's Sahab data (PROTECTED)
  fastify.get('/data', {
    preHandler: [requireAuth],
    schema: {
      description: 'Get user\'s Sahab data',
      tags: ['Sahab', 'Protected'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array' },
                pagination: { type: 'object' },
                meta: { type: 'object' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userContext = getUserContext(request);
    const { page = 1, limit = 20 } = request.query;
    const adminAccess = isAdmin(request);

    // Filter data by user (unless admin)
    let filteredData = adminAccess 
      ? sahabData 
      : sahabData.filter(item => item.userId === userContext.id);

    const total = filteredData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      success: true,
      message: adminAccess ? 'All Sahab data retrieved' : 'User Sahab data retrieved',
      data: {
        items: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        meta: {
          filteredByUser: !adminAccess,
          isAdmin: adminAccess,
          userId: userContext.id
        }
      },
      timestamp: new Date().toISOString()
    };
  });

  // Create Sahab data (PROTECTED)
  fastify.post('/data', {
    preHandler: [requireAuth],
    schema: {
      description: 'Create new Sahab data',
      tags: ['Sahab', 'Protected'],
      body: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string', minLength: 1 },
          content: { type: 'string', minLength: 1 },
          category: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userContext = getUserContext(request);
    const { title, content, category = 'general' } = request.body;

    const newItem = {
      id: nextId++,
      title,
      content,
      category,
      userId: userContext.id,
      userEmail: userContext.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    sahabData.push(newItem);

    return reply.status(201).send({
      success: true,
      message: 'Sahab data created successfully',
      data: newItem,
      timestamp: new Date().toISOString()
    });
  });

  // Update Sahab data (PROTECTED - own data or admin)
  fastify.put('/data/:id', {
    preHandler: [requireAuth],
    schema: {
      description: 'Update Sahab data (own data or admin)',
      tags: ['Sahab', 'Protected'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          content: { type: 'string', minLength: 1 },
          category: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userContext = getUserContext(request);
    const itemId = parseInt(request.params.id);
    const updates = request.body;

    const itemIndex = sahabData.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return reply.status(404).send({
        success: false,
        error: 'Sahab data not found',
        timestamp: new Date().toISOString()
      });
    }

    const item = sahabData[itemIndex];
    const adminAccess = isAdmin(request);
    const isOwner = item.userId === userContext.id;

    if (!isOwner && !adminAccess) {
      return reply.status(403).send({
        success: false,
        error: 'Access denied. You can only update your own data.',
        timestamp: new Date().toISOString()
      });
    }

    // Update the item
    sahabData[itemIndex] = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return {
      success: true,
      message: 'Sahab data updated successfully',
      data: sahabData[itemIndex],
      timestamp: new Date().toISOString()
    };
  });

  // Delete Sahab data (PROTECTED - own data or admin)
  fastify.delete('/data/:id', {
    preHandler: [requireAuth],
    schema: {
      description: 'Delete Sahab data (own data or admin)',
      tags: ['Sahab', 'Protected'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userContext = getUserContext(request);
    const itemId = parseInt(request.params.id);

    const itemIndex = sahabData.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return reply.status(404).send({
        success: false,
        error: 'Sahab data not found',
        timestamp: new Date().toISOString()
      });
    }

    const item = sahabData[itemIndex];
    const adminAccess = isAdmin(request);
    const isOwner = item.userId === userContext.id;

    if (!isOwner && !adminAccess) {
      return reply.status(403).send({
        success: false,
        error: 'Access denied. You can only delete your own data.',
        timestamp: new Date().toISOString()
      });
    }

    // Remove the item
    sahabData.splice(itemIndex, 1);

    return {
      success: true,
      message: 'Sahab data deleted successfully',
      timestamp: new Date().toISOString()
    };
  });
}

/**
 * Error handlers
 */
function registerErrorHandlers() {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      status: 'error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      statusCode,
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      status: 'error',
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
    await registerCorePlugins();
    await registerRoutes();
    registerErrorHandlers();

    await fastify.listen({ port: PORT, host: HOST });
    
    fastify.log.info(`🚀 Sahab API Server is running on port ${PORT}`);
    console.log(`🚀 Sahab API Server is running on http://localhost:${PORT}`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  fastify.log.info('Received SIGTERM, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

// Start the server
startServer();

export default fastify;