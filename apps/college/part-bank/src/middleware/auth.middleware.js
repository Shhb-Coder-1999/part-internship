/**
 * Authentication Middleware for Part Bank API
 * Integrates with gateway authentication or provides local auth for testing
 */

import { jwtService } from '@shared/core/auth';
import { gatewayClient } from '#app/clients';
import { createPRDErrorResponse } from '#app/utils';
import { HTTP_STATUS, ERROR_CODES } from '#app/constants';

/**
 * Create authentication middleware for Fastify
 */
export function createAuthMiddleware(fastify) {
  // Authentication decorator
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      // Skip authentication for health and docs endpoints
      const skipRoutes = ['/health', '/', '/api-docs', '/documentation'];
      if (skipRoutes.some(route => request.url.startsWith(route))) {
        return;
      }

      // Check for authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'Authorization header missing or invalid'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Try to verify token locally first
      let user;
      try {
        const decoded = jwtService.verifyToken(token);
        user = {
          id: decoded.id,
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          roles: decoded.roles || ['user']
        };
      } catch (jwtError) {
        // If local verification fails, try gateway verification
        request.log.info('Local JWT verification failed, trying gateway verification');
        
        const gatewayResult = await gatewayClient.verifyToken(token);
        if (!gatewayResult.valid) {
          const response = createPRDErrorResponse(
            ERROR_CODES.INVALID_TOKEN,
            'Invalid or expired token'
          );
          return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
        }
        user = gatewayResult.user;
      }

      // Add user info to request
      request.user = user;
      
    } catch (error) {
      request.log.error('Authentication error:', error);
      const response = createPRDErrorResponse(
        ERROR_CODES.INVALID_TOKEN,
        'Authentication failed'
      );
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
    }
  });

  // Optional authentication decorator (for endpoints that work with or without auth)
  fastify.decorate('optionalAuth', async function(request, reply) {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No authentication provided, continue without user context
        return;
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwtService.verifyToken(token);
        request.user = {
          id: decoded.id,
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          roles: decoded.roles || ['user']
        };
      } catch (jwtError) {
        // If token is invalid, continue without user context
        request.log.debug('Optional auth failed, continuing without user context');
      }
    } catch (error) {
      request.log.debug('Optional auth error, continuing without user context:', error.message);
    }
  });

  // Role-based authorization decorator
  fastify.decorate('authorize', function(requiredRoles = []) {
    return async function(request, reply) {
      if (!request.user) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'Authentication required'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
      }

      if (requiredRoles.length === 0) {
        // No specific roles required, just need to be authenticated
        return;
      }

      const hasRequiredRole = requiredRoles.some(role => 
        request.user.roles?.includes(role)
      );

      if (!hasRequiredRole) {
        const response = createPRDErrorResponse(
          ERROR_CODES.FORBIDDEN,
          `Access denied. Required roles: ${requiredRoles.join(', ')}`
        );
        return reply.status(HTTP_STATUS.FORBIDDEN).send(response);
      }
    };
  });
}

export default createAuthMiddleware;