/**
 * Fastify-based Comments API Server
 * High-performance comments service with JSON Schema validation
 */

import { createFastifyServer } from './src/server-instance.js';
import { ENV_VARS, DEFAULTS } from './src/constants/index.js';

// Environment variables
const PORT = process.env[ENV_VARS.PORT] || DEFAULTS.PORT;
const HOST = process.env[ENV_VARS.HOST] || DEFAULTS.HOST;

// Create server instance
const fastify = await createFastifyServer();

/**
 * Error handler
 */
function registerErrorHandlers() {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Validation errors
    if (error.validation) {
      reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: error.validation,
        statusCode: 400,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      reply.status(429).send({
        success: false,
        error: 'Rate limit exceeded',
        message: error.message,
        statusCode: 429,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      success: false,
      error: error.name || 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      statusCode,
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: 'Not Found',
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
    // Register error handlers
    registerErrorHandlers();

    // Start server
    await fastify.listen({ port: PORT, host: HOST });
    
    fastify.log.info(`🚀 Fastify Comments API v2.0.0 running on port ${PORT}`);
    fastify.log.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
    fastify.log.info(`🔍 Health Check: http://localhost:${PORT}/health`);
    fastify.log.info(`💬 Comments API: http://localhost:${PORT}/api/comments`);

    console.log(`🚀 Fastify Comments API Server is running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation at http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health`);

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

// Start the server
startServer();

export default fastify;