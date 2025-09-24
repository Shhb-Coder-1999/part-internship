/**
 * User Repository - Database operations for users
 */

import { prismaClient } from '#app/clients';
import { ConflictError, NotFoundError } from '@shared/core/utils';

export class UserRepository {
  constructor() {
    this.prisma = prismaClient;
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    try {
      return await this.prisma.user.create({
        data: {
          phoneNumber: userData.phoneNumber,
          firstName: userData.firstName,
          lastName: userData.lastName,
          idNumber: userData.idNumber,
          passwordHash: userData.passwordHash,
          status: userData.status || 'ACTIVE'
        },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          idNumber: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        if (error.meta?.target?.includes('phoneNumber')) {
          throw new ConflictError('Phone number already exists');
        }
      }
      throw error;
    }
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber) {
    return await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        idNumber: true,
        passwordHash: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    return await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        idNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  /**
   * Find user with password (for authentication)
   */
  async findByPhoneNumberWithPassword(phoneNumber) {
    return await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        idNumber: true,
        passwordHash: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  /**
   * Update user status
   */
  async updateStatus(id, status) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          status: true,
          updatedAt: true
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundError('User not found');
      }
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(id, passwordHash) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { passwordHash },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          updatedAt: true
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundError('User not found');
      }
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    try {
      await this.prisma.user.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundError('User not found');
      }
      throw error;
    }
  }

  /**
   * Check if phone number exists
   */
  async phoneNumberExists(phoneNumber) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true }
    });
    return !!user;
  }

  /**
   * Check if ID number exists
   */
  async idNumberExists(idNumber) {
    const user = await this.prisma.user.findFirst({
      where: { idNumber },
      select: { id: true }
    });
    return !!user;
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.user.count({
      where: { status: 'ACTIVE' }
    });
    const lockedUsers = await this.prisma.user.count({
      where: { status: 'LOCKED' }
    });
    const disabledUsers = await this.prisma.user.count({
      where: { status: 'DISABLED' }
    });

    return {
      total: totalUsers,
      active: activeUsers,
      locked: lockedUsers,
      disabled: disabledUsers
    };
  }
}

export default new UserRepository();