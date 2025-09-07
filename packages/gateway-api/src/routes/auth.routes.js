/**
 * Authentication Routes
 * Handles user registration, login, profile, and admin operations
 */

import { jwtService } from '@shared/core/auth';
import { createUserTokenResponse, createErrorResponse, sendResponse } from '@shared/core/utils';
import * as schemas from '../schemas/index.js';

export async function authRoutes(fastify, options) {
  // Get prisma client from gateway context
  const prisma = fastify.prisma;

  // Register
  fastify.post('/register', {
    schema: {
      description: 'Register a new user account',
      tags: ['Authentication'],
      body: schemas.userRegistration,
      response: {
        201: schemas.userCreationResponse,
        400: schemas.errorResponse,
        409: schemas.errorResponse
      }
    }
  }, async (request, reply) => {
    const { email, password, firstName, lastName } = request.body;

    try {
      const userService = (await import('../../database/userService.js')).UserService;
      const service = new userService();

      // Create new user with default role
      const newUser = await service.createUser({
        email,
        password,
        firstName,
        lastName,
        roles: ['user']
      });

      // Try to create default comments for the user
      await createDefaultComments(newUser, fastify.log);

      return reply.status(201).send({
        success: true,
        message: 'User registered successfully',
        data: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          isActive: newUser.isActive,
          isVerified: newUser.isVerified,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          roles: newUser.roles || ['user']
        },
        meta: {
          timestamp: new Date().toISOString(),
          service: 'gateway-auth',
          version: '2.0.0',
        },
      });
    } catch (error) {
      request.log.error(error);

      if (error.message.includes('already exists')) {
        return reply.status(409).send({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.status(400).send({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Login
  fastify.post('/login', {
    schema: {
      description: 'Authenticate user and receive JWT token',
      tags: ['Authentication'],
      body: schemas.userLogin,
      response: {
        200: schemas.authSuccessResponse,
        401: schemas.errorResponse
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;

    try {
      const userService = (await import('../../database/userService.js')).UserService;
      const service = new userService();

      const user = await service.authenticateUser(email, password);

      if (!user) {
        const authError = createErrorResponse(
          'Unauthorized',
          'Invalid credentials',
          401
        );
        return sendResponse(reply, authError);
      }

      // Generate token using shared JWT service
      const tokenData = jwtService.createUserToken({
        ...user,
        roles: user.roles || ['user']
      });

      const response = createUserTokenResponse(
        user,
        tokenData,
        'Login successful'
      );

      return reply.send(response);
    } catch (error) {
      request.log.error(error);
      const authError = createErrorResponse(
        'Unauthorized',
        'Authentication failed',
        401
      );
      return sendResponse(reply, authError);
    }
  });

  // Profile
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
            success: { type: 'boolean', example: true },
            data: schemas.userBase,
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                service: { type: 'string', example: 'gateway-auth' },
                version: { type: 'string', example: '2.0.0' }
              }
            }
          }
        },
        401: schemas.errorResponse
      }
    }
  }, async request => {
    return { 
      success: true, 
      data: {
        id: request.user.id,
        email: request.user.email,
        firstName: request.user.firstName,
        lastName: request.user.lastName,
        roles: request.user.roles,
        isActive: request.user.isActive,
        isVerified: request.user.isVerified,
        createdAt: request.user.createdAt,
        updatedAt: request.user.updatedAt
      },
      meta: {
        timestamp: new Date().toISOString(),
        service: 'gateway-auth',
        version: '2.0.0'
      }
    };
  });

  // Refresh token
  fastify.post('/refresh', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Refresh JWT token with current user context',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            token: { 
              type: 'string',
              description: 'New JWT access token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string', format: 'email' },
                roles: { type: 'array', items: { type: 'string' } }
              }
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                service: { type: 'string', example: 'gateway-auth' },
                version: { type: 'string', example: '2.0.0' }
              }
            }
          }
        },
        401: schemas.errorResponse
      }
    }
  }, async request => {
    const newToken = fastify.jwt.sign({
      id: request.user.id,
      email: request.user.email,
      roles: request.user.roles
    });
    
    return { 
      success: true, 
      token: newToken, 
      data: {
        id: request.user.id,
        email: request.user.email,
        roles: request.user.roles
      },
      meta: {
        timestamp: new Date().toISOString(),
        service: 'gateway-auth',
        version: '2.0.0'
      }
    };
  });
}

// Helper function to create default comments
async function createDefaultComments(user, logger) {
  try {
    const commentsService = {
      url: process.env.COMMENTS_SERVICE_URL || 'http://localhost:3001'
    };
    
    const commentsResponse = await fetch(`${commentsService.url}/api/comments/defaults`, {
      method: 'POST',
      headers: {
        'x-user-id': user.id,
        'x-user-email': user.email,
        'x-user-roles': JSON.stringify(user.roles || ['user']),
        'x-gateway-forwarded': 'true',
        'Content-Type': 'application/json'
      }
    });

    if (commentsResponse.ok) {
      const result = await commentsResponse.json();
      logger.info(`Created ${result.data?.count || 0} default comments for new user ${user.email}`);
    } else {
      logger.warn(`Failed to create default comments for user ${user.email}: ${commentsResponse.status}`);
    }
  } catch (commentError) {
    // Don't fail user registration if comment creation fails
    logger.warn(`Error creating default comments for user ${user.email}:`, commentError.message);
  }
}

export default authRoutes;