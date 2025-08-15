/**
 * JWT Authentication Plugin for Comments API
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * JWT Authentication Plugin
 */
export default async function authPlugin(fastify, options) {
  // Decorate fastify with authenticate function
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authorization header missing',
          statusCode: 401,
          timestamp: new Date().toISOString()
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authorization header must start with "Bearer "',
          statusCode: 401,
          timestamp: new Date().toISOString()
        });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Verify and decode the token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Add user info to request object
      request.user = decoded;
      
    } catch (error) {
      let message = 'Invalid token';
      
      if (error.name === 'TokenExpiredError') {
        message = 'Token has expired';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Invalid token format';
      }

      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message,
        statusCode: 401,
        timestamp: new Date().toISOString()
      });
    }
  });
}