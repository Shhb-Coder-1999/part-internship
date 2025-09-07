/**
 * Core Gateway Routes
 * Handles health checks, gateway info, and service discovery
 */

import * as schemas from '../schemas/index.js';
import { gatewayConfig } from '../../config/fastify.config.js';

export async function coreRoutes(fastify, options) {
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
        'recruitment-comments': 'proxied',
        'recruitment-users': 'proxied',
        'recruitment-sahab': 'proxied',
        'college': 'planned',
        'internship': 'planned'
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
        type: 'JWT',
        endpoints: {
          register: '/auth/register',
          login: '/auth/login',
          profile: '/auth/profile',
          refresh: '/auth/refresh'
        }
      },
      services: {
        'recruitment-comments': `${gatewayConfig.services.recruitment.comments.url}${gatewayConfig.services.recruitment.comments.prefix}`,
        'recruitment-users': `${gatewayConfig.services.recruitment.users.url}${gatewayConfig.services.recruitment.users.prefix}`,
        'recruitment-sahab': `${gatewayConfig.services.recruitment.sahab.url}${gatewayConfig.services.recruitment.sahab.prefix}`,
        'college': 'planned',
        'internship': 'planned'
      },
    };
  });
}

export default coreRoutes;