/**
 * Part Bank API Fastify Service
 * Minimal banking-style API with user auth, deposit accounts, and transaction feed
 */

import { createFastifyServer } from './src/server-instance.js';
import { ENV_VARS, DEFAULTS } from '#app/constants';

// Environment variables
const PORT = process.env[ENV_VARS.PORT] || DEFAULTS.PORT || 3002;
const HOST = process.env[ENV_VARS.HOST] || DEFAULTS.HOST || '0.0.0.0';

// Create server instance
const fastify = await createFastifyServer();

/**
 * Start the server
 */
async function startServer() {
  try {
    // Start server
    await fastify.listen({ port: PORT, host: HOST });
    
    fastify.log.info(`🚀 Part Bank API v1.0.0 running on port ${PORT}`);
    fastify.log.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
    fastify.log.info(`🔍 Health Check: http://localhost:${PORT}/health`);

    console.log(`🚀 Part Bank API Server is running on http://localhost:${PORT}`);
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