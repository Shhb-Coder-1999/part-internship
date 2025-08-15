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
