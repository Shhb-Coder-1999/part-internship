/**
 * Admin Routes
 * Handles admin-only operations like user management
 */

import * as schemas from '../schemas/index.js';

export async function adminRoutes(fastify, options) {
  // Add admin authentication to all routes in this plugin
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireAdmin);

  // Admin user creation
  fastify.post('/users', {
    schema: {
      description: 'Create a new user (admin only)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: schemas.adminUserCreation,
      response: {
        201: schemas.userCreationResponse,
        400: schemas.errorResponse,
        401: schemas.errorResponse,
        403: schemas.errorResponse,
        409: schemas.errorResponse
      }
    }
  }, async (request, reply) => {
    const { email, password, firstName, lastName, isActive = true, isVerified = false, roles = ['user'] } = request.body;

    try {
      const userService = (await import('../../database/userService.js')).UserService;
      const service = new userService();

      const newUser = await service.createUser({
        email,
        password,
        firstName,
        lastName,
        isActive,
        isVerified,
        roles
      });

      return reply.status(201).send({
        success: true,
        message: 'User created successfully',
        data: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          isActive: newUser.isActive,
          isVerified: newUser.isVerified,
          roles: newUser.roles,
          meta: newUser.meta,
        },
        meta: {
          timestamp: new Date().toISOString(),
          service: 'gateway-auth',
          version: '2.0.0',
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Admin user listing
  fastify.get('/users', {
    schema: {
      description: 'List all users with pagination (admin only)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: schemas.userListQuery,
      response: {
        200: schemas.paginationResponse,
        401: schemas.errorResponse,
        403: schemas.errorResponse,
        500: schemas.errorResponse
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = request.query;
      
      const userService = (await import('../../database/userService.js')).UserService;
      const service = new userService();
      
      const users = await service.getAllUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        order
      });

      return {
        success: true,
        users: users.data,
        pagination: users.pagination,
        meta: {
          timestamp: new Date().toISOString(),
          service: 'gateway-auth',
          version: '2.0.0',
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve users',
        timestamp: new Date().toISOString(),
      });
    }
  });
}

export default adminRoutes;