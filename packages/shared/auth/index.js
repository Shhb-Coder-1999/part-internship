/**
 * Shared Auth Index
 * Exports all authentication-related functions
 */

export { 
  authenticateToken,
  requireRole,
  optionalAuth,
  rateLimit
} from './middleware.js';

export {
  extractUserContext,
  requireAuth,
  requireRoles,
  getUserContext,
  hasRole,
  isAdmin,
  isOwnerOrAdmin
} from './userContext.js';

// Fastify-compatible exports
export {
  extractUserContext as fastifyExtractUserContext,
  requireAuth as fastifyRequireAuth,
  requireRoles as fastifyRequireRoles,
  optionalAuth as fastifyOptionalAuth,
  requireGateway,
  getUserContext as fastifyGetUserContext,
  hasRole as fastifyHasRole,
  isAdmin as fastifyIsAdmin,
  isOwnerOrAdmin as fastifyIsOwnerOrAdmin
} from './fastifyAuth.js';
