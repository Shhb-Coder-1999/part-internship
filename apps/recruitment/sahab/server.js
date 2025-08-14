import Fastify from 'fastify';

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
 * Register routes
 */
async function registerRoutes() {
  // Health check endpoint
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

  // Root endpoint
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
      message: 'Sahab API Server',
      version: '1.0.0',
      status: '🚧 In Development',
      framework: 'Fastify',
      endpoints: {
        health: 'GET /health'
      }
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