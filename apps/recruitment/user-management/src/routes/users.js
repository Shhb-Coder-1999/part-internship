/**
 * User Routes
 * Defines all user-related API endpoints with JWT authentication
 */

import { UserController } from '../controllers/userController.js';
import { 
  extractUserContext, 
  requireAuth, 
  requireRoles 
} from '../../../../../packages/shared/auth/index.js';

const userController = new UserController();

export default async function userRoutes(fastify, options) {
  // Register user context middleware for all routes
  fastify.addHook('preHandler', extractUserContext);

  // Get all users (ADMIN only can see all, users see only themselves)
  fastify.get('/', {
    preHandler: [requireAuth],
    schema: {
      description: 'Get all users (admin) or current user profile (user)',
      tags: ['Users', 'Protected'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          role: { type: 'string' },
          isActive: { type: 'boolean' },
          isVerified: { type: 'boolean' }
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
                users: { type: 'array' },
                pagination: { type: 'object' },
                meta: { type: 'object' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, userController.getUsers.bind(userController));

  // Get current user profile
  fastify.get('/me', {
    preHandler: [requireAuth],
    schema: {
      description: 'Get current user profile',
      tags: ['Users', 'Profile'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, userController.getCurrentUser.bind(userController));

  // Get user by ID (own profile or admin access)
  fastify.get('/:id', {
    preHandler: [requireAuth],
    schema: {
      description: 'Get user by ID (own profile or admin access)',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            timestamp: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', enum: [false] },
            error: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, userController.getUserById.bind(userController));

  // Create new user
  fastify.post('/', {
    schema: {
      description: 'Create a new user',
      tags: ['Users'],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 50 },
          password: { type: 'string', minLength: 6 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' }
        },
        required: ['email', 'username', 'password']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            timestamp: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean', enum: [false] },
            error: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, userController.createUser.bind(userController));

  // Update user
  fastify.patch('/:id', {
    schema: {
      description: 'Update user by ID',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 50 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' },
          isActive: { type: 'boolean' },
          isVerified: { type: 'boolean' }
        }
      }
    }
  }, userController.updateUser.bind(userController));

  // Delete user
  fastify.delete('/:id', {
    schema: {
      description: 'Delete user by ID',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, userController.deleteUser.bind(userController));

  // Search users
  fastify.get('/search', {
    schema: {
      description: 'Search users',
      tags: ['Users'],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        },
        required: ['q']
      }
    }
  }, userController.searchUsers.bind(userController));
}