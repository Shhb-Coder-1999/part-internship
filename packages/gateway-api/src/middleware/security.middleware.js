/**
 * Fastify Security Middleware
 * Security configurations and utilities for Fastify gateway
 */

import { authConfig } from '../../config/auth.config.js';

// Security Headers Configuration (for @fastify/helmet)
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
};

// General Rate Limiting Configuration
export const generalRateLimitConfig = {
  max: authConfig.rateLimit.maxRequests,
  timeWindow: authConfig.rateLimit.windowMs,
  errorResponseBuilder: (request, context) => ({
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
    retryAfter: Math.ceil(authConfig.rateLimit.windowMs / 1000),
    timestamp: new Date().toISOString()
  }),
  // Skip rate limiting for health checks
  skip: (request, key) => request.url === '/health'
};

// Strict Rate Limiting for Auth Routes
export const authRateLimitConfig = {
  max: authConfig.rateLimit.authMaxRequests,
  timeWindow: authConfig.rateLimit.authWindowMs,
  errorResponseBuilder: (request, context) => ({
    error: 'Too many authentication attempts',
    message: 'Too many login attempts from this IP, please try again later.',
    statusCode: 429,
    retryAfter: Math.ceil(authConfig.rateLimit.authWindowMs / 1000),
    timestamp: new Date().toISOString()
  })
};

// CORS Configuration
export const corsConfig = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = authConfig.cors.allowedOrigins;
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this origin doesn\'t allow access from the origin.';
    return callback(new Error(msg), false);
  },
  credentials: authConfig.cors.credentials,
  methods: authConfig.cors.methods,
  allowedHeaders: authConfig.cors.allowedHeaders,
  exposedHeaders: authConfig.cors.exposedHeaders,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Content Type Validation
export const validateContentType = async (request, reply) => {
  const method = request.method;
  const contentType = request.headers['content-type'];
  
  // Skip validation for GET, HEAD, DELETE methods
  if (['GET', 'HEAD', 'DELETE'].includes(method)) {
    return;
  }
  
  // Require JSON content type for POST, PUT, PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    if (!contentType || !contentType.includes('application/json')) {
      reply.status(400).send({
        error: 'Invalid Content-Type',
        message: 'Content-Type must be application/json',
        statusCode: 400,
        timestamp: new Date().toISOString()
      });
      return;
    }
  }
};

// API Key Authentication Middleware
export const apiKeyAuth = async (request, reply) => {
  const apiKey = request.headers['x-api-key'];
  
  if (!apiKey) {
    reply.status(401).send({
      error: 'API Key Missing',
      message: 'X-API-Key header is required',
      statusCode: 401,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // Validate API key (replace with your actual validation logic)
  const validApiKeys = authConfig.apiKeys || [];
  if (!validApiKeys.includes(apiKey)) {
    reply.status(401).send({
      error: 'Invalid API Key',
      message: 'The provided API key is not valid',
      statusCode: 401,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // Add API key info to request context
  request.apiKey = apiKey;
};

// Request ID Middleware (for tracing)
export const requestIdGenerator = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Security Headers for specific routes
export const additionalSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// File Upload Security Configuration
export const fileUploadConfig = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5, // Max 5 files per request
    fieldNameSize: 100, // Max field name size
    fieldSize: 1024 * 1024, // Max field value size (1MB)
    fields: 10 // Max number of non-file fields
  },
  allowedMimeTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv'
  ]
};

// Request logging configuration for Fastify
export const requestLoggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
    censor: '[Redacted]'
  },
  serializers: {
    req: (request) => ({
      method: request.method,
      url: request.url,
      hostname: request.hostname,
      remoteAddress: request.ip,
      remotePort: request.connection?.remotePort,
      userAgent: request.headers['user-agent']
    }),
    res: (reply) => ({
      statusCode: reply.statusCode,
      responseTime: reply.getResponseTime?.()
    })
  }
};

// Error response formatter
export const formatErrorResponse = (error, statusCode = 500) => ({
  success: false,
  error: error.name || 'Internal Server Error',
  message: error.message || 'An unexpected error occurred',
  statusCode,
  timestamp: new Date().toISOString(),
  ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
});

// Success response formatter
export const formatSuccessResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString()
});

export default {
  helmetConfig,
  generalRateLimitConfig,
  authRateLimitConfig,
  corsConfig,
  validateContentType,
  apiKeyAuth,
  requestIdGenerator,
  additionalSecurityHeaders,
  fileUploadConfig,
  requestLoggingConfig,
  formatErrorResponse,
  formatSuccessResponse
};