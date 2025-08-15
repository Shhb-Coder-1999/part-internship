/**
 * User Context Middleware
 * Extracts user information from gateway headers and attaches to request
 */

import { logger } from '@app/shared/utils';

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

    // Set user context on request
    req.user = null;
    
    if (userId) {
      req.user = {
        id: userId,
        email: userEmail,
        roles: userRoles ? JSON.parse(userRoles) : []
      };
      
      logger.debug('User context extracted', {
        userId,
        userEmail,
        roles: req.user.roles
      });
    }

    next();
  } catch (error) {
    logger.error('Failed to extract user context', error);
    // Continue without user context for public endpoints
    req.user = null;
    next();
  }
};

/**
 * Middleware to require authentication
 * Use this for protected endpoints that require a user
 */
export const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
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
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRoles
      });
    }

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