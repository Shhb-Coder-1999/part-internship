/**
 * Role Repository
 * Handles all role-related database operations using Prisma
 */

import { PrismaClient } from '@prisma/client';
import { createAppLogger } from '../../../../../packages/shared/utils/index.js';
import { LOG_CONTEXTS, PRISMA_ERROR_CODES } from '../constants/index.js';

const prisma = new PrismaClient();
const logger = createAppLogger(LOG_CONTEXTS.DATABASE);

export class RoleRepository {
  constructor() {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Get all roles with pagination and filtering
   */
  async getRoles(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        isActive = null,
      } = options;

      const where = {};
      
      // Search filter
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
        ];
      }

      // Status filter
      if (isActive !== null) where.isActive = isActive;

      const skip = (page - 1) * limit;
      const [roles, total] = await Promise.all([
        this.prisma.role.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            userRoles: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        }),
        this.prisma.role.count({ where }),
      ]);

      return {
        roles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to retrieve roles', { options }, error);
      throw new Error(`Failed to retrieve roles: ${error.message}`);
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(id) {
    try {
      return await this.prisma.role.findUnique({
        where: { id },
        include: {
          userRoles: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  isActive: true,
                }
              }
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to retrieve role by ID', { roleId: id }, error);
      throw new Error(`Failed to retrieve role: ${error.message}`);
    }
  }

  /**
   * Get role by name
   */
  async getRoleByName(name) {
    try {
      return await this.prisma.role.findUnique({
        where: { name: name.toLowerCase() },
        include: {
          userRoles: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                }
              }
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to retrieve role by name', { roleName: name }, error);
      throw new Error(`Failed to retrieve role by name: ${error.message}`);
    }
  }

  /**
   * Create a new role
   */
  async createRole(roleData) {
    try {
      const role = await this.prisma.role.create({
        data: {
          ...roleData,
          name: roleData.name.toLowerCase(),
        },
        include: {
          userRoles: true
        }
      });

      this.logger.info('Role created successfully', { roleId: role.id, name: role.name });
      return role;
    } catch (error) {
      this.logger.error('Failed to create role', { roleData }, error);
      
      if (error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
        throw new Error('Role name already exists');
      }
      
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  /**
   * Update role
   */
  async updateRole(id, roleData) {
    try {
      const role = await this.prisma.role.update({
        where: { id },
        data: {
          ...roleData,
          ...(roleData.name && { name: roleData.name.toLowerCase() }),
        },
        include: {
          userRoles: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                }
              }
            }
          }
        }
      });

      this.logger.info('Role updated successfully', { roleId: id });
      return role;
    } catch (error) {
      this.logger.error('Failed to update role', { roleId: id, roleData }, error);
      
      if (error.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
        throw new Error('Role not found');
      }
      
      if (error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
        throw new Error('Role name already exists');
      }
      
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  /**
   * Delete role
   */
  async deleteRole(id) {
    try {
      // Check if role is assigned to any users
      const userRolesCount = await this.prisma.userRole.count({
        where: { roleId: id }
      });

      if (userRolesCount > 0) {
        throw new Error('Role cannot be deleted as it is assigned to users');
      }

      const role = await this.prisma.role.delete({
        where: { id }
      });

      this.logger.info('Role deleted successfully', { roleId: id });
      return role;
    } catch (error) {
      this.logger.error('Failed to delete role', { roleId: id }, error);
      
      if (error.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
        throw new Error('Role not found');
      }
      
      throw error; // Re-throw to preserve custom error messages
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId, roleId) {
    try {
      const userRole = await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            }
          },
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          }
        }
      });

      this.logger.info('Role assigned to user successfully', { userId, roleId });
      return userRole;
    } catch (error) {
      this.logger.error('Failed to assign role to user', { userId, roleId }, error);
      
      if (error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
        throw new Error('User already has this role');
      }
      
      if (error.code === PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT) {
        throw new Error('User or role not found');
      }
      
      throw new Error(`Failed to assign role: ${error.message}`);
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRoleFromUser(userId, roleId) {
    try {
      const userRole = await this.prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId,
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            }
          },
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          }
        }
      });

      this.logger.info('Role revoked from user successfully', { userId, roleId });
      return userRole;
    } catch (error) {
      this.logger.error('Failed to revoke role from user', { userId, roleId }, error);
      
      if (error.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
        throw new Error('User role assignment not found');
      }
      
      throw new Error(`Failed to revoke role: ${error.message}`);
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId) {
    try {
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId },
        include: {
          role: true
        }
      });

      return userRoles.map(ur => ur.role);
    } catch (error) {
      this.logger.error('Failed to get user roles', { userId }, error);
      throw new Error(`Failed to get user roles: ${error.message}`);
    }
  }

  /**
   * Get role statistics
   */
  async getRoleStats() {
    try {
      const [total, active, userRoleAssignments] = await Promise.all([
        this.prisma.role.count(),
        this.prisma.role.count({ where: { isActive: true } }),
        this.prisma.userRole.count(),
      ]);

      return {
        total,
        active,
        inactive: total - active,
        assignments: userRoleAssignments,
      };
    } catch (error) {
      this.logger.error('Failed to get role statistics', {}, error);
      throw new Error(`Failed to get role statistics: ${error.message}`);
    }
  }

  /**
   * Search roles
   */
  async searchRoles(searchTerm, limit = 10) {
    try {
      const roles = await this.prisma.role.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm } },
            { description: { contains: searchTerm } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
        }
      });

      return roles;
    } catch (error) {
      this.logger.error('Failed to search roles', { searchTerm, limit }, error);
      throw new Error(`Failed to search roles: ${error.message}`);
    }
  }
}