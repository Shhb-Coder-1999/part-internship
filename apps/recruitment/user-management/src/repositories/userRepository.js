/**
 * User Repository
 * Handles all user-related database operations using Prisma
 */

import { PrismaClient } from '@prisma/client';
import { createAppLogger } from '@shared/core/utils';
import { LOG_CONTEXTS, PRISMA_ERROR_CODES, DB_CONFIG } from '../constants/index.js';

const prisma = new PrismaClient();
const logger = createAppLogger(LOG_CONTEXTS.DATABASE);

export class UserRepository {
  constructor() {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        role = null,
        isActive = null,
        isVerified = null,
      } = options;

      const where = {};
      
      // Search filter
      if (search) {
        where.OR = [
          { email: { contains: search } },
          { username: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ];
      }

      // Status filters
      if (isActive !== null) where.isActive = isActive;
      if (isVerified !== null) where.isVerified = isVerified;

      // Role filter
      if (role) {
        where.userRoles = {
          some: {
            role: { name: role }
          }
        };
      }

      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to retrieve users', { options }, error);
      throw new Error(`Failed to retrieve users: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
        include: {
          userRoles: {
            include: {
              role: true
            }
          },
          sessions: true,
        }
      });
    } catch (error) {
      this.logger.error('Failed to retrieve user by ID', { userId: id }, error);
      throw new Error(`Failed to retrieve user: ${error.message}`);
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      return await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          userRoles: {
            include: {
              role: true
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to retrieve user by email', { email }, error);
      throw new Error(`Failed to retrieve user by email: ${error.message}`);
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username) {
    try {
      return await this.prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        include: {
          userRoles: {
            include: {
              role: true
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to retrieve user by username', { username }, error);
      throw new Error(`Failed to retrieve user by username: ${error.message}`);
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          email: userData.email.toLowerCase(),
          username: userData.username.toLowerCase(),
        }
      });

      this.logger.info('User created successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', { userData: { ...userData, password: '[HIDDEN]' } }, error);
      
      if (error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
        const field = error.meta?.target?.includes('email') ? 'email' : 'username';
        throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`);
      }
      
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Update user
   */
  async updateUser(id, userData) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...userData,
          ...(userData.email && { email: userData.email.toLowerCase() }),
          ...(userData.username && { username: userData.username.toLowerCase() }),
        }
      });

      this.logger.info('User updated successfully', { userId: id });
      return user;
    } catch (error) {
      this.logger.error('Failed to update user', { userId: id, userData }, error);
      
      if (error.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
        throw new Error('User not found');
      }
      
      if (error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
        const field = error.meta?.target?.includes('email') ? 'email' : 'username';
        throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`);
      }
      
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Update user password
   */
  async updateUserPassword(id, hashedPassword) {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });

      this.logger.info('User password updated successfully', { userId: id });
    } catch (error) {
      this.logger.error('Failed to update user password', { userId: id }, error);
      
      if (error.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
        throw new Error('User not found');
      }
      
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Update last login time
   */
  async updateLastLogin(id) {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      this.logger.error('Failed to update last login', { userId: id }, error);
      // Don't throw error for this non-critical operation
    }
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(id) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          username: true,
          isActive: true,
        }
      });

      this.logger.info('User deactivated successfully', { userId: id });
      return user;
    } catch (error) {
      this.logger.error('Failed to delete user', { userId: id }, error);
      
      if (error.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
        throw new Error('User not found');
      }
      
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Search users
   */
  async searchUsers(searchTerm, limit = 10) {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: searchTerm } },
            { username: { contains: searchTerm } },
            { firstName: { contains: searchTerm } },
            { lastName: { contains: searchTerm } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
        }
      });

      return users;
    } catch (error) {
      this.logger.error('Failed to search users', { searchTerm, limit }, error);
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const [total, active, verified] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isVerified: true } }),
      ]);

      return {
        total,
        active,
        verified,
        inactive: total - active,
        unverified: total - verified,
      };
    } catch (error) {
      this.logger.error('Failed to get user statistics', {}, error);
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }
}