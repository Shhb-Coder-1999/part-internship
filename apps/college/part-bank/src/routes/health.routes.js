/**
 * Health Check Routes
 */

import { prismaClient } from '#app/clients';

export default async function healthRoutes(fastify, options) {
  // Basic health check
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' },
            version: { type: 'string' },
            uptime: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'part-bank-api',
      version: '1.0.0',
      uptime: process.uptime()
    };
  });

  // Detailed health check with database connectivity
  fastify.get('/health/detailed', {
    schema: {
      description: 'Detailed health check with dependencies',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' },
            version: { type: 'string' },
            uptime: { type: 'number' },
            dependencies: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();
    
    // Check database connectivity
    let dbStatus = 'healthy';
    let dbResponseTime = 0;
    
    try {
      const dbStart = Date.now();
      await prismaClient.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbStart;
    } catch (error) {
      dbStatus = 'unhealthy';
      fastify.log.error('Database health check failed:', error);
    }

    const totalResponseTime = Date.now() - startTime;

    return {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'part-bank-api',
      version: '1.0.0',
      uptime: process.uptime(),
      dependencies: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime
        }
      }
    };
  });

  // Readiness probe
  fastify.get('/ready', {
    schema: {
      description: 'Readiness probe for Kubernetes',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // Check if the service is ready to accept traffic
    let ready = true;
    
    try {
      // Test database connection
      await prismaClient.$queryRaw`SELECT 1`;
    } catch (error) {
      ready = false;
      fastify.log.error('Readiness check failed:', error);
    }

    if (!ready) {
      reply.status(503);
    }

    return {
      ready,
      timestamp: new Date().toISOString()
    };
  });

  // Liveness probe
  fastify.get('/live', {
    schema: {
      description: 'Liveness probe for Kubernetes',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            alive: { type: 'boolean' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      alive: true,
      timestamp: new Date().toISOString()
    };
  });
}