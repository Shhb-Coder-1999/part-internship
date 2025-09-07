// Middleware exports (simplified)
export { 
  extractUserContext, 
  requireAuth, 
  requireRoles, 
  optionalAuth 
} from '../../../../../packages/shared/auth/index.js';
export { default as router } from '../routes/comments.js';
