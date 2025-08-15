/**
 * Authentication Plugin for Comments API
 * Uses shared authentication plugin
 */

import { authPlugin as sharedAuthPlugin } from '@shared/core/auth';

export default async function commentsAuthPlugin(fastify, options) {
  // Register the shared auth plugin
  await fastify.register(sharedAuthPlugin, {
    jwtSecret: process.env.JWT_SECRET,
    skipRoutes: ['/health', '/'],
  });
}