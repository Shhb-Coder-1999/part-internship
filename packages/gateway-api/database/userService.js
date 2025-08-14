/**
 * Database User Service
 * Replaces in-memory user storage with persistent database operations
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './client.js';
import { authConfig } from '../config/auth.config.js';

export class UserService {
  constructor() {
    this.prisma = db.getClient();
  }

  /**
   * Create a new user
   */
  async createUser({ email, password, firstName, lastName, roles = ['user'] }) {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, authConfig.password.saltRounds);

      // Create user with roles in transaction
      const user = await this.prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
          }
        });

        // Assign roles
        for (const roleName of roles) {
          // Find or create role
          let role = await tx.role.findUnique({
            where: { name: roleName }
          });

          if (!role) {
            role = await tx.role.create({
              data: {
                name: roleName,
                description: `Auto-created role: ${roleName}`,
              }
            });
          }

          // Assign role to user
          await tx.userRole.create({
            data: {
              userId: newUser.id,
              roleId: role.id,
            }
          });
        }

        return newUser;
      });

      // Return user with roles
      return await this.getUserWithRoles(user.id);
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          },
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      return user ? this.formatUserWithRoles(user) : null;
    } catch (error) {
      throw new Error(`Failed to get user by email: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    try {
      return await this.getUserWithRoles(id);
    } catch (error) {
      throw new Error(`Failed to get user by ID: ${error.message}`);
    }
  }

  /**
   * Get user with roles and permissions
   */
  async getUserWithRoles(userId) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          },
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      return user ? this.formatUserWithRoles(user) : null;
    } catch (error) {
      throw new Error(`Failed to get user with roles: ${error.message}`);
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(email, password) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user || !user.isActive) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return null;
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      return await this.getUserWithRoles(user.id);
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId, currentPassword, newPassword) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, authConfig.password.saltRounds);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Store refresh token
   */
  async storeRefreshToken(userId, token, expiresAt) {
    try {
      await this.prisma.refreshToken.create({
        data: {
          token,
          userId,
          expiresAt,
        }
      });
    } catch (error) {
      throw new Error(`Failed to store refresh token: ${error.message}`);
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token) {
    try {
      const refreshToken = await this.prisma.refreshToken.findUnique({
        where: { token },
        include: {
          user: true
        }
      });

      if (!refreshToken || refreshToken.isRevoked || refreshToken.expiresAt < new Date()) {
        return null;
      }

      return await this.getUserWithRoles(refreshToken.userId);
    } catch (error) {
      throw new Error(`Failed to verify refresh token: ${error.message}`);
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token) {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { token },
        data: { isRevoked: true }
      });
    } catch (error) {
      throw new Error(`Failed to revoke refresh token: ${error.message}`);
    }
  }

  /**
   * Clean expired refresh tokens
   */
  async cleanExpiredTokens() {
    try {
      const deleted = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true }
          ]
        }
      });
      return deleted.count;
    } catch (error) {
      throw new Error(`Failed to clean expired tokens: ${error.message}`);
    }
  }

  /**
   * Log user action for audit
   */
  async logUserAction(userId, action, resource = null, metadata = null, ipAddress = null, userAgent = null) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          metadata: metadata ? JSON.stringify(metadata) : null,
          ipAddress,
          userAgent,
        }
      });
    } catch (error) {
      console.error('Failed to log user action:', error);
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Format user object with roles and permissions
   */
  formatUserWithRoles(user) {
    if (!user) return null;

    // Extract roles
    const roles = user.roles?.map(ur => ur.role.name) || [];
    
    // Extract permissions from roles and direct permissions
    const rolePermissions = user.roles?.flatMap(ur => 
      ur.role.permissions?.map(rp => rp.permission.name) || []
    ) || [];
    
    const directPermissions = user.permissions?.map(up => up.permission.name) || [];
    
    // Combine and deduplicate permissions
    const permissions = [...new Set([...rolePermissions, ...directPermissions])];

    // Return formatted user (without password)
    const { password, ...userWithoutPassword } = user;
    
    return {
      ...userWithoutPassword,
      roles,
      permissions,
    };
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          skip,
          take: limit,
          include: {
            roles: {
              include: {
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        this.prisma.user.count()
      ]);

      return {
        users: users.map(user => this.formatUserWithRoles(user)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get all users: ${error.message}`);
    }
  }
}

export default UserService;