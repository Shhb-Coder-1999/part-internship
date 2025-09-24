/**
 * Authentication Routes
 */

import { AuthController } from '#app/controllers';
import { authSchemas } from '#app/schemas';

export default async function authRoutes(fastify, options) {
  const controller = AuthController;

  // Apply auth rate limiting to all routes in this prefix
  await fastify.register(import('@fastify/rate-limit'), {
    ...fastify.rateLimitConfig.auth,
    errorResponseBuilder: (request, context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later'
      }
    })
  });

  // Sign up
  fastify.post('/sign-up', {
    schema: {
      description: 'Create a new user account',
      tags: ['Authentication'],
      body: authSchemas.signUpRequest,
      response: {
        201: authSchemas.signUpResponse,
        400: authSchemas.errorResponse,
        409: authSchemas.errorResponse,
        422: authSchemas.errorResponse
      }
    }
  }, controller.signUp.bind(controller));

  // Login
  fastify.post('/login', {
    schema: {
      description: 'Authenticate user and receive JWT token',
      tags: ['Authentication'],
      body: authSchemas.loginRequest,
      response: {
        200: authSchemas.loginResponse,
        401: authSchemas.errorResponse,
        422: authSchemas.errorResponse
      }
    }
  }, controller.login.bind(controller));

  // Logout
  fastify.post('/logout', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Invalidate user token',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        204: {
          type: 'null',
          description: 'Logout successful'
        },
        401: authSchemas.errorResponse
      }
    }
  }, controller.logout.bind(controller));

  // Get profile
  fastify.get('/profile', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Get current user profile information',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                userId: { type: 'string', format: 'uuid' },
                phoneNumber: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                status: { type: 'string', enum: ['ACTIVE', 'LOCKED', 'DISABLED'] },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        401: authSchemas.errorResponse
      }
    }
  }, controller.getProfile.bind(controller));

  // Change password
  fastify.post('/change-password', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Change user password',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6, maxLength: 128 }
        },
        required: ['currentPassword', 'newPassword']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' }
              }
            }
          }
        },
        401: authSchemas.errorResponse,
        422: authSchemas.errorResponse
      }
    }
  }, controller.changePassword.bind(controller));
}