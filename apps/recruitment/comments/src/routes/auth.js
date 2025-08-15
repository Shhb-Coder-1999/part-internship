/**
 * Authentication Routes for Comments API
 * Provides register and login endpoints to get JWT tokens for testing
 */

import { jwtService, passwordService } from '@shared/core/auth';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createUserTokenResponse,
  sendResponse 
} from '@shared/core/utils';

// Simple in-memory user storage for demo purposes
const users = new Map();

/**
 * Authentication routes plugin
 */
export default async function authRoutes(fastify, options) {
  
  // User Registration
  fastify.post('/register', {
    schema: {
      description: 'Register a new user to get JWT token for API testing',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { 
            type: 'string', 
            format: 'email',
            description: 'User email address'
          },
          password: { 
            type: 'string', 
            minLength: 6,
            description: 'User password (minimum 6 characters)'
          },
          firstName: { 
            type: 'string', 
            minLength: 1,
            description: 'User first name'
          },
          lastName: { 
            type: 'string', 
            minLength: 1,
            description: 'User last name'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    roles: { type: 'array', items: { type: 'string' } }
                  }
                },
                token: { 
                  type: 'string', 
                  description: 'JWT token for API authentication'
                },
                refreshToken: { 
                  type: 'string', 
                  description: 'JWT refresh token'
                },
                expiresIn: { 
                  type: 'string', 
                  description: 'Token expiration time'
                },
                tokenType: { 
                  type: 'string', 
                  description: 'Token type (Bearer)'
                }
              }
            },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password, firstName, lastName } = request.body;

      // Check if user already exists
      if (users.has(email)) {
        const conflictResponse = createErrorResponse(
          'Conflict',
          'User with this email already exists',
          409
        );
        return sendResponse(reply, conflictResponse);
      }

      // Hash password
      const hashedPassword = await passwordService.hashPassword(password);

      // Create user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = {
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        createdAt: new Date().toISOString()
      };

      users.set(email, user);

      // Generate JWT token using shared service
      const tokenData = jwtService.createUserToken(user, { expiresIn: '24h' });

      // Manual response (shared utils have serialization issues)
      const response = {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles || []
          },
          token: tokenData.token,
          refreshToken: tokenData.refreshToken,
          expiresIn: tokenData.expiresIn,
          tokenType: tokenData.tokenType
        },
        timestamp: new Date().toISOString()
      };

      return reply.status(201).send(response);

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to register user',
        statusCode: 500,
        timestamp: new Date().toISOString()
      });
    }
  });

  // User Login
  fastify.post('/login', {
    schema: {
      description: 'Login with existing credentials to get JWT token',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { 
            type: 'string', 
            format: 'email',
            description: 'User email address'
          },
          password: { 
            type: 'string',
            description: 'User password'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    roles: { type: 'array', items: { type: 'string' } }
                  }
                },
                token: { 
                  type: 'string', 
                  description: 'JWT token for API authentication'
                },
                refreshToken: { 
                  type: 'string', 
                  description: 'JWT refresh token'
                },
                expiresIn: { 
                  type: 'string', 
                  description: 'Token expiration time'
                },
                tokenType: { 
                  type: 'string', 
                  description: 'Token type (Bearer)'
                }
              }
            },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password } = request.body;

      // Find user
      const user = users.get(email);
      if (!user) {
        const authErrorResponse = createErrorResponse(
          'Unauthorized',
          'Invalid email or password',
          401
        );
        return sendResponse(reply, authErrorResponse);
      }

      // Verify password using shared service
      const isValidPassword = await passwordService.verifyPassword(password, user.password);
      if (!isValidPassword) {
        const authErrorResponse = createErrorResponse(
          'Unauthorized',
          'Invalid email or password',
          401
        );
        return sendResponse(reply, authErrorResponse);
      }

      // Generate JWT token using shared service
      const tokenData = jwtService.createUserToken(user, { expiresIn: '24h' });

      // Manual response (shared utils have serialization issues)
      const response = {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles || []
          },
          token: tokenData.token,
          refreshToken: tokenData.refreshToken,
          expiresIn: tokenData.expiresIn,
          tokenType: tokenData.tokenType
        },
        timestamp: new Date().toISOString()
      };

      return reply.send(response);

    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Login failed',
        statusCode: 500,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get current user profile (requires authentication)
  fastify.get('/profile', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Get current user profile (requires authentication)',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' }
              }
            },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // User info is available from the authenticate preHandler  
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication failed - no user context',
        statusCode: 401,
        timestamp: new Date().toISOString()
      });
    }
    
    const user = users.get(request.user.email);
    
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'User not found',
        statusCode: 401,
        timestamp: new Date().toISOString()
      });
    }

    reply.send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      timestamp: new Date().toISOString()
    });
  });

  // Token validation endpoint
  fastify.post('/validate-token', {
    schema: {
      description: 'Validate a JWT token',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { 
            type: 'string', 
            description: 'JWT token to validate'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            valid: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' }
              }
            },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { token } = request.body;

      const user = jwtService.validateTokenAndGetUser(token);
      
      if (user) {
        const response = createSuccessResponse(
          {
            valid: true,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName
            }
          },
          'Token is valid'
        );
        return sendResponse(reply, response);
      } else {
        const response = createSuccessResponse(
          { valid: false },
          'Invalid or expired token'
        );
        return sendResponse(reply, response);
      }

    } catch (error) {
      const response = createSuccessResponse(
        { valid: false },
        'Invalid or expired token'
      );
      return sendResponse(reply, response);
    }
  });
}