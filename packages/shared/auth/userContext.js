/**
 * Universal User Context Middleware
 * Extracts user information from gateway headers for all services
 */

import { createAppLogger } from '../utils/index.js';

const logger = createAppLogger('UserContext');

/**
 * Middleware to extract user context from gateway headers
 * Gateway forwards user info via headers: X-User-ID, X-User-Email, X-User-Roles
 */
export const extractUserContext = (req, res, next) => {
  try {
    // Extract user info from headers forwarded by gateway
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userRoles = req.headers['x-user-roles'];
    const requestId = req.headers['x-request-id'];
    const serviceName = req.headers['x-service-name'];

    // Set user context on request
    req.user = null;
    req.requestId = requestId;
    req.serviceName = serviceName;
    
    if (userId) {
      req.user = {
        id: userId,
        email: userEmail,
        roles: userRoles ? JSON.parse(userRoles) : []
      };
      
      logger.debug('User context extracted', {
        userId,
        userEmail,
        roles: req.user.roles,
        requestId,
        serviceName
      });
    } else {
      logger.warn('No user context found in headers', {
        requestId,
        serviceName,
        path: req.path,
        method: req.method
      });
    }

    next();
  } catch (error) {
    logger.error('Failed to extract user context', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to extract user context',
      code: 'USER_CONTEXT_ERROR'
    });
  }
};

/**
 * Middleware to require authentication
 * Use this for protected endpoints that require a user
 */
export const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    logger.warn('Authentication required but no user found', {
      path: req.path,
      method: req.method,
      requestId: req.requestId
    });
    
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  logger.debug('Authentication successful', {
    userId: req.user.id,
    path: req.path,
    method: req.method,
    requestId: req.requestId
  });
  
  next();
};

/**
 * Middleware to require specific roles
 * @param {string[]} allowedRoles - Array of roles that can access this endpoint
 */
export const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoles = req.user.roles || [];
    const hasPermission = allowedRoles.some(role => 
      userRoles.includes(role) || userRoles.includes('admin')
    );

    if (!hasPermission) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userRoles,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
        requestId: req.requestId
      });
      
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRoles
      });
    }

    logger.debug('Authorization successful', {
      userId: req.user.id,
      userRoles,
      requiredRoles: allowedRoles,
      path: req.path,
      method: req.method,
      requestId: req.requestId
    });

    next();
  };
};

/**
 * Middleware for optional authentication
 * Sets user context if available, but doesn't require it
 */
export const optionalAuth = (req, res, next) => {
  // User context is already extracted by extractUserContext
  // This middleware is just for semantic clarity
  next();
};

/**
 * Get user context from request
 * @param {Object} req - Express request object
 * @returns {Object|null} User context or null
 */
export const getUserContext = (req) => {
  return req.user || null;
};

/**
 * Check if user has specific role
 * @param {Object} req - Express request object
 * @param {string} role - Role to check
 * @returns {boolean} True if user has role
 */
export const hasRole = (req, role) => {
  const user = getUserContext(req);
  if (!user) return false;
  
  const userRoles = user.roles || [];
  return userRoles.includes(role) || userRoles.includes('admin');
};

/**
 * Check if user is admin
 * @param {Object} req - Express request object
 * @returns {boolean} True if user is admin
 */
export const isAdmin = (req) => {
  return hasRole(req, 'admin');
};

/**
 * Check if user owns resource (by ID)
 * @param {Object} req - Express request object
 * @param {string} resourceUserId - User ID that owns the resource
 * @returns {boolean} True if user owns resource or is admin
 */
export const isOwnerOrAdmin = (req, resourceUserId) => {
  const user = getUserContext(req);
  if (!user) return false;
  
  return user.id === resourceUserId || isAdmin(req);
};