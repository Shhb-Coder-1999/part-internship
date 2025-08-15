/**
 * Authentication Routes for Comments API
 * Provides register and login endpoints to get JWT tokens for testing
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Simple in-memory user storage for demo purposes
const users = new Map();

// JWT secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' }
              }
            },
            token: { 
              type: 'string', 
              description: 'JWT token for API authentication'
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
        return reply.status(409).send({
          success: false,
          error: 'Conflict',
          message: 'User with this email already exists',
          statusCode: 409,
          timestamp: new Date().toISOString()
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

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

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: userId, 
          email, 
          firstName, 
          lastName 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      reply.status(201).send({
        success: true,
        message: 'User registered successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        token,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
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
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' }
              }
            },
            token: { 
              type: 'string', 
              description: 'JWT token for API authentication'
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
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid email or password',
          statusCode: 401,
          timestamp: new Date().toISOString()
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid email or password',
          statusCode: 401,
          timestamp: new Date().toISOString()
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      reply.send({
        success: true,
        message: 'Login successful',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        token,
        timestamp: new Date().toISOString()
      });

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
    preHandler: [async (request, reply) => {
      await fastify.authenticate(request, reply);
    }],
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

      const decoded = jwt.verify(token, JWT_SECRET);
      
      reply.send({
        success: true,
        valid: true,
        data: {
          id: decoded.id,
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      reply.send({
        success: true,
        valid: false,
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }
  });
}