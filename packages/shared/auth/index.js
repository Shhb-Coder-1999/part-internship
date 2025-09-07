/**
 * Shared Auth Index
 * Exports essential authentication-related functions
 */

// JWT and Password services
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

// Fastify auth middleware
export {
  extractUserContext,
  requireAuth,
  requireRoles,
  optionalAuth,
  requireGateway,
  getUserContext,
  hasRole,
  isAdmin,
  isOwnerOrAdmin
} from './fastifyAuth.js';
