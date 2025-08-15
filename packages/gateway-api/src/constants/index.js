/**
 * API Gateway Constants
 */

export {
  HTTP_STATUS,
} from '../../shared/constants/index.js';

// Gateway specific constants
export const GATEWAY_CONFIG = {
  PORT: 3000,
  HOST: '0.0.0.0',
  VERSION: '1.0.0',
  CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
};

export const SERVICE_ENDPOINTS = {
  COMMENTS: {
    NAME: 'comments',
    BASE_URL: process.env.COMMENTS_SERVICE_URL || 'http://localhost:3001',
    HEALTH: '/health',
    API: '/api/comments',
  },

};

export const API_MESSAGES = {
  SUCCESS: {
    GATEWAY_RUNNING: 'API Gateway is running',
    SERVICE_HEALTHY: 'Service is healthy',
    REQUEST_PROXIED: 'Request proxied successfully',
  },
  ERROR: {
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    AUTHENTICATION_FAILED: 'Authentication failed',
    AUTHORIZATION_FAILED: 'Authorization failed',
    INVALID_REQUEST: 'Invalid request',
    GATEWAY_ERROR: 'Gateway error',
  },
};

export const LOG_CONTEXTS = {
  GATEWAY: 'APIGateway',
  PROXY: 'ProxyService',
  AUTH: 'Authentication',
  RATE_LIMIT: 'RateLimit',
  HEALTH_CHECK: 'HealthCheck',
};

export const ENV_VARS = {
  PORT: 'PORT',
  HOST: 'HOST',
  NODE_ENV: 'NODE_ENV',
  JWT_SECRET: 'JWT_SECRET',
  COMMENTS_SERVICE_URL: 'COMMENTS_SERVICE_URL',

};