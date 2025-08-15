/**
 * Centralized Fastify Authentication Plugin
 * Provides JWT authentication functionality for Fastify applications
 */

import { jwtService } from './jwt.service.js';
import { HTTP_STATUS, API_MESSAGES } from '../constants/index.js';

/**
 * Fastify Authentication Plugin
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Plugin options
 */
export default async function authPlugin(fastify, options = {}) {
  const { 
    jwtSecret,
    skipRoutes = [],
    errorHandler = null,
  } = options;

  // Initialize JWT service with custom secret if provided
  const jwt = jwtSecret ? jwtService : jwtService;
  if (jwtSecret) {
    jwt.secret = jwtSecret;
  }

  /**
   * Authentication decorator function
   */
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      // Skip authentication for specified routes
      if (skipRoutes.includes(request.url)) {
        return;
      }

      // Extract token from Authorization header
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        const error = {
          success: false,
          error: 'Unauthorized',
          message: API_MESSAGES.ERROR.UNAUTHORIZED,
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          timestamp: new Date().toISOString()
        };

        if (errorHandler) {
          return errorHandler(error, request, reply);
        }

        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(error);
      }

      const token = jwt.extractTokenFromHeader(authHeader);
      
      if (!token) {
        const error = {
          success: false,
          error: 'Unauthorized',
          message: 'Authorization header must start with "Bearer "',
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          timestamp: new Date().toISOString()
        };

        if (errorHandler) {
          return errorHandler(error, request, reply);
        }

        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(error);
      }

      // Verify and decode the token
      const user = jwt.validateTokenAndGetUser(token);
      
      if (!user) {
        const error = {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          timestamp: new Date().toISOString()
        };

        if (errorHandler) {
          return errorHandler(error, request, reply);
        }

        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(error);
      }

      // Add user info to request object
      request.user = user;
      
    } catch (error) {
      let message = 'Invalid token';
      
      if (error.name === 'TokenExpiredError') {
        message = 'Token has expired';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Invalid token format';
      }

      const authError = {
        success: false,
        error: 'Unauthorized',
        message,
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        timestamp: new Date().toISOString()
      };

      if (errorHandler) {
        return errorHandler(authError, request, reply);
      }

      return reply.status(HTTP_STATUS.UNAUTHORIZED).send(authError);
    }
  });

  /**
   * Optional authentication decorator (doesn't throw error if no token)
   */
  fastify.decorate('optionalAuthenticate', async function(request, reply) {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        request.user = null;
        return;
      }

      const token = jwt.extractTokenFromHeader(authHeader);
      
      if (!token) {
        request.user = null;
        return;
      }

      const user = jwt.validateTokenAndGetUser(token);
      request.user = user;
      
    } catch (error) {
      request.user = null;
    }
  });

  /**
   * Role-based authorization decorator
   */
  fastify.decorate('requireRole', function(roles) {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    return async function(request, reply) {
      // First authenticate
      await fastify.authenticate(request, reply);
      
      if (!request.user) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          timestamp: new Date().toISOString()
        });
      }

      // Check if user has required role
      const userRoles = request.user.roles || [];
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: 'Forbidden',
          message: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
          statusCode: HTTP_STATUS.FORBIDDEN,
          timestamp: new Date().toISOString()
        });
      }
    };
  });

  /**
   * Check if user is admin
   */
  fastify.decorate('requireAdmin', async function(request, reply) {
    await fastify.requireRole(['admin'])(request, reply);
  });

  /**
   * Check if user is owner or admin
   */
  fastify.decorate('requireOwnerOrAdmin', function(getOwnerId) {
    return async function(request, reply) {
      await fastify.authenticate(request, reply);
      
      if (!request.user) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          timestamp: new Date().toISOString()
        });
      }

      const userRoles = request.user.roles || [];
      const isAdmin = userRoles.includes('admin');
      
      if (isAdmin) {
        return; // Admin can access everything
      }

      // Check if user is the owner
      const ownerId = typeof getOwnerId === 'function' ? getOwnerId(request) : getOwnerId;
      const isOwner = request.user.id === ownerId;
      
      if (!isOwner) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied. You can only access your own resources.',
          statusCode: HTTP_STATUS.FORBIDDEN,
          timestamp: new Date().toISOString()
        });
      }
    };
  });

  /**
   * Generate authentication preHandler
   */
  fastify.decorate('createAuthPreHandler', function(options = {}) {
    const { 
      requireAuth = true, 
      roles = [], 
      permissions = [],
      ownerCheck = null,
    } = options;

    return async function(request, reply) {
      if (requireAuth) {
        await fastify.authenticate(request, reply);
      } else {
        await fastify.optionalAuthenticate(request, reply);
        return;
      }

      if (!request.user) {
        return;
      }

      // Role check
      if (roles.length > 0) {
        const userRoles = request.user.roles || [];
        const hasRequiredRole = roles.some(role => userRoles.includes(role));
        
        if (!hasRequiredRole) {
          return reply.status(HTTP_STATUS.FORBIDDEN).send({
            success: false,
            error: 'Forbidden',
            message: `Access denied. Required roles: ${roles.join(', ')}`,
            statusCode: HTTP_STATUS.FORBIDDEN,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Permission check
      if (permissions.length > 0) {
        const userPermissions = request.user.permissions || [];
        const hasRequiredPermission = permissions.some(permission => 
          userPermissions.includes(permission) || userPermissions.includes('*')
        );
        
        if (!hasRequiredPermission) {
          return reply.status(HTTP_STATUS.FORBIDDEN).send({
            success: false,
            error: 'Forbidden',
            message: `Access denied. Required permissions: ${permissions.join(', ')}`,
            statusCode: HTTP_STATUS.FORBIDDEN,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Owner check
      if (ownerCheck) {
        const userRoles = request.user.roles || [];
        const isAdmin = userRoles.includes('admin');
        
        if (!isAdmin) {
          const ownerId = typeof ownerCheck === 'function' ? ownerCheck(request) : ownerCheck;
          const isOwner = request.user.id === ownerId;
          
          if (!isOwner) {
            return reply.status(HTTP_STATUS.FORBIDDEN).send({
              success: false,
              error: 'Forbidden',
              message: 'Access denied. You can only access your own resources.',
              statusCode: HTTP_STATUS.FORBIDDEN,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    };
  });

  // Register JWT utilities on fastify instance
  fastify.decorate('jwt', {
    sign: jwt.generateToken.bind(jwt),
    verify: jwt.verifyToken.bind(jwt),
    decode: jwt.decodeToken.bind(jwt),
    createUserToken: jwt.createUserToken.bind(jwt),
  });
}