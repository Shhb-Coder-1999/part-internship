/**
 * Authentication Plugin for Comments API
 * Uses shared authentication functions
 */

import { extractUserContext, requireAuth, requireRoles, requireGateway, optionalAuth } from '@shared/core/auth';

export default async function commentsAuthPlugin(fastify, options) {
  const { skipRoutes = ['/health', '/'] } = options || {};
  
  // Add global hook to extract user context from gateway headers
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for certain routes
    if (skipRoutes.includes(request.url)) {
      return;
    }
    
    await extractUserContext(request, reply);
  });
  
  // Make auth functions available on fastify instance
  fastify.decorate('requireAuth', requireAuth);
  fastify.decorate('requireRoles', requireRoles);
  fastify.decorate('requireGateway', requireGateway);
  fastify.decorate('optionalAuth', optionalAuth);
}