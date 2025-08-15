/**
 * Shared Auth Index
 * Exports all authentication-related functions
 */

// New centralized services
export {
  JWTService,
  jwtService,
  createJWTService
} from './jwt.service.js';

export {
  PasswordService,
  passwordService,
  createPasswordService
} from './password.service.js';

// Centralized Fastify plugin
export { default as authPlugin } from './fastify-auth.plugin.js';

// Legacy middleware exports (for backward compatibility)
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
