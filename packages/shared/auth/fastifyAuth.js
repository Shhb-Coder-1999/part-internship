/**
 * Fastify-compatible User Context Middleware
 * Extracts user information from gateway headers for all services
 */

import { createAppLogger } from '../utils/index.js';

const logger = createAppLogger('FastifyAuth');

/**
 * Fastify hook to extract user context from gateway headers
 * Gateway forwards user info via headers: x-user-id, x-user-email, x-user-roles
 */
export const extractUserContext = async (request, reply) => {
  try {
    // Extract user info from headers forwarded by gateway
    const userId = request.headers['x-user-id'];
    const userEmail = request.headers['x-user-email'];
    const userRoles = request.headers['x-user-roles'];
    const requestId = request.headers['x-request-id'];
    const isGatewayForwarded = request.headers['x-gateway-forwarded'];

    // Set user context on request
    request.user = null;
    request.requestId = requestId;
    request.isGatewayForwarded = isGatewayForwarded === 'true';
    
    if (userId) {
      request.user = {
        id: userId,
        email: userEmail,
        roles: userRoles ? JSON.parse(userRoles) : []
      };
      
      logger.debug('User context extracted from gateway', {
        userId,
        userEmail,
        roles: request.user.roles,
        requestId,
        path: request.url,
        method: request.method
      });
    } else {
      logger.debug('No user context found in headers', {
        requestId,
        path: request.url,
        method: request.method,
        isGatewayForwarded
      });
    }

  } catch (error) {
    logger.error('Failed to extract user context', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to extract user context',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Fastify hook to require authentication
 * Use this for protected endpoints that require a user
 */
export const requireAuth = async (request, reply) => {
  if (!request.user || !request.user.id) {
    logger.warn('Authentication required but no user found', {
      path: request.url,
      method: request.method,
      requestId: request.requestId,
      isGatewayForwarded: request.isGatewayForwarded
    });
    
    return reply.status(401).send({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }
  
  logger.debug('Authentication successful', {
    userId: request.user.id,
    path: request.url,
    method: request.method,
    requestId: request.requestId
  });
};

/**
 * Fastify hook factory to require specific roles
 * @param {string[]} allowedRoles - Array of roles that can access this endpoint
 */
export const requireRoles = (allowedRoles = []) => {
  return async (request, reply) => {
    if (!request.user || !request.user.id) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    const userRoles = request.user.roles || [];
    const hasPermission = allowedRoles.some(role => 
      userRoles.includes(role) || userRoles.includes('admin')
    );

    if (!hasPermission) {
      logger.warn('Insufficient permissions', {
        userId: request.user.id,
        userRoles,
        requiredRoles: allowedRoles,
        path: request.url,
        method: request.method,
        requestId: request.requestId
      });
      
      return reply.status(403).send({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRoles,
        timestamp: new Date().toISOString()
      });
    }

    logger.debug('Authorization successful', {
      userId: request.user.id,
      userRoles,
      requiredRoles: allowedRoles,
      path: request.url,
      method: request.method,
      requestId: request.requestId
    });
  };
};

/**
 * Fastify hook for optional authentication
 * Sets user context if available, but doesn't require it
 */
export const optionalAuth = async (request, reply) => {
  // User context is already extracted by extractUserContext
  // This hook is just for semantic clarity and doesn't need to do anything
};

/**
 * Get user context from request
 * @param {Object} request - Fastify request object
 * @returns {Object|null} User context or null
 */
export const getUserContext = (request) => {
  return request.user || null;
};

/**
 * Check if user has specific role
 * @param {Object} request - Fastify request object
 * @param {string} role - Role to check
 * @returns {boolean} True if user has role
 */
export const hasRole = (request, role) => {
  const user = getUserContext(request);
  if (!user) return false;
  
  const userRoles = user.roles || [];
  return userRoles.includes(role) || userRoles.includes('admin');
};

/**
 * Check if user is admin
 * @param {Object} request - Fastify request object
 * @returns {boolean} True if user is admin
 */
export const isAdmin = (request) => {
  return hasRole(request, 'admin');
};

/**
 * Check if user owns resource (by ID)
 * @param {Object} request - Fastify request object
 * @param {string} resourceUserId - User ID that owns the resource
 * @returns {boolean} True if user owns resource or is admin
 */
export const isOwnerOrAdmin = (request, resourceUserId) => {
  const user = getUserContext(request);
  if (!user) return false;
  
  return user.id === resourceUserId || isAdmin(request);
};

/**
 * Middleware to validate gateway forwarding
 * Ensures requests come through the gateway
 */
export const requireGateway = async (request, reply) => {
  const isGatewayForwarded = request.headers['x-gateway-forwarded'] === 'true';
  
  if (!isGatewayForwarded && process.env.NODE_ENV !== 'test') {
    logger.warn('Direct access attempted - gateway required', {
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });
    
    return reply.status(403).send({
      success: false,
      error: 'Direct access not allowed. Requests must go through API gateway.',
      code: 'GATEWAY_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }
};