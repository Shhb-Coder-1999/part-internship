/**
 * Users Routes
 * Handles user profile and user management operations
 */

import * as schemas from '../schemas/index.js';

export async function usersRoutes(fastify, options) {
  // Add authentication to all routes in this plugin
  fastify.addHook('preHandler', fastify.authenticate);
  const prisma = fastify.prisma;

  // Get all users (accessible by users with 'user' role)
  fastify.get('/', {
    schema: {
      description: 'Get all users (accessible by authenticated users)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string', description: 'Search by name or email' },
          isActive: { type: 'boolean', description: 'Filter by active status' },
          isVerified: { type: 'boolean', description: 'Filter by verified status' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                users: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      phoneNumber: { type: 'string' },
                      age: { type: 'integer' },
                      gender: { type: 'string' },
                      address: { type: 'string' },
                      birthday: { type: 'string', format: 'date-time' },
                      isActive: { type: 'boolean' },
                      isVerified: { type: 'boolean' },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' }
                  }
                }
              }
            },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        401: schemas.errorResponse
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 20, search, isActive, isVerified } = request.query;
      const skip = (page - 1) * limit;

      // Build where clause for filtering
      const where = {};
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }
      if (isActive !== undefined) where.isActive = isActive;
      if (isVerified !== undefined) where.isVerified = isVerified;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            age: true,
            gender: true,
            address: true,
            birthday: true,
            isActive: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      return {
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch users',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get user by ID (accessible by authenticated users)
  fastify.get('/:id', {
    schema: {
      description: 'Get user by ID (accessible by authenticated users)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'User ID' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phoneNumber: { type: 'string' },
                age: { type: 'integer' },
                gender: { type: 'string' },
                address: { type: 'string' },
                birthday: { type: 'string', format: 'date-time' },
                isActive: { type: 'boolean' },
                isVerified: { type: 'boolean' },
                lastLogin: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'User not found' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        401: schemas.errorResponse
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          age: true,
          gender: true,
          address: true,
          birthday: true,
          isActive: true,
          isVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch user',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Update user profile (users can update their own profile)
  fastify.put('/:id', {
    schema: {
      description: 'Update user profile (users can update their own profile)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'User ID' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 50 },
          lastName: { type: 'string', minLength: 1, maxLength: 50 },
          phoneNumber: { type: 'string' },
          address: { type: 'string' },
          birthday: { type: 'string', format: 'date-time' },
          gender: { type: 'string', enum: ['مرد', 'زن', 'ترجیح می‌دهم نگویم'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'User updated successfully' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phoneNumber: { type: 'string' },
                age: { type: 'integer' },
                gender: { type: 'string' },
                address: { type: 'string' },
                birthday: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Access denied' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'User not found' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        401: schemas.errorResponse
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Users can only update their own profile (unless they're admin)
      const hasAdminRole = request.user.roles?.includes('admin');
      if (!hasAdminRole && request.user.id !== id) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. You can only update your own profile.',
          timestamp: new Date().toISOString()
        });
      }

      // Calculate age if birthday is provided
      if (updateData.birthday) {
        const birthDate = new Date(updateData.birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        updateData.age = age;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          age: true,
          gender: true,
          address: true,
          birthday: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        });
      }
      
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update user',
        timestamp: new Date().toISOString()
      });
    }
  });
}

export default usersRoutes;