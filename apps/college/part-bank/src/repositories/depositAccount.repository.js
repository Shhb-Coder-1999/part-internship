/**
 * Deposit Account Repository - Database operations for deposit accounts
 */

import { prismaClient } from '#app/clients';
import { NotFoundError, ConflictError } from '@shared/core/utils';

export class DepositAccountRepository {
  constructor() {
    this.prisma = prismaClient;
  }

  /**
   * Create a new deposit account
   */
  async createAccount(accountData) {
    try {
      return await this.prisma.depositAccount.create({
        data: {
          userId: accountData.userId,
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          address: accountData.address,
          postalCode: accountData.postalCode,
          cardNumber: accountData.cardNumber,
          balance: accountData.balance || 0,
          scoreAmount: accountData.scoreAmount || 0,
          scorePaymentPeriod: accountData.scorePaymentPeriod || 'TWELVE',
          upcomingInstalmentAmount: accountData.upcomingInstalmentAmount || 0,
          upcomingInstalmentDueDate: accountData.upcomingInstalmentDueDate,
          documentType: accountData.documentType || 'nationalCardImage',
          documentContentType: accountData.documentContentType,
          documentSize: accountData.documentSize,
          documentId: accountData.documentId
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          address: true,
          postalCode: true,
          cardNumber: true,
          balance: true,
          scoreAmount: true,
          scorePaymentPeriod: true,
          upcomingInstalmentAmount: true,
          upcomingInstalmentDueDate: true,
          documentType: true,
          documentContentType: true,
          documentSize: true,
          documentId: true,
          createdAt: true,
          updatedAt: true
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        if (error.meta?.target?.includes('cardNumber')) {
          throw new ConflictError('Card number already exists');
        }
      }
      throw error;
    }
  }

  /**
   * Find accounts by user ID with pagination
   */
  async findByUserId(userId, page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    
    const [accounts, total] = await Promise.all([
      this.prisma.depositAccount.findMany({
        where: { userId },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          address: true,
          postalCode: true,
          cardNumber: true,
          balance: true,
          scoreAmount: true,
          scorePaymentPeriod: true,
          upcomingInstalmentAmount: true,
          upcomingInstalmentDueDate: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.depositAccount.count({
        where: { userId }
      })
    ]);

    return { accounts, total };
  }

  /**
   * Find account by ID and user ID
   */
  async findByIdAndUserId(accountId, userId) {
    return await this.prisma.depositAccount.findFirst({
      where: {
        id: accountId,
        userId
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        address: true,
        postalCode: true,
        cardNumber: true,
        balance: true,
        scoreAmount: true,
        scorePaymentPeriod: true,
        upcomingInstalmentAmount: true,
        upcomingInstalmentDueDate: true,
        documentType: true,
        documentContentType: true,
        documentSize: true,
        documentId: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  /**
   * Find account by ID
   */
  async findById(accountId) {
    return await this.prisma.depositAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        address: true,
        postalCode: true,
        cardNumber: true,
        balance: true,
        scoreAmount: true,
        scorePaymentPeriod: true,
        upcomingInstalmentAmount: true,
        upcomingInstalmentDueDate: true,
        documentType: true,
        documentContentType: true,
        documentSize: true,
        documentId: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  /**
   * Delete account by ID and user ID
   */
  async deleteByIdAndUserId(accountId, userId) {
    try {
      const deletedAccount = await this.prisma.depositAccount.delete({
        where: {
          id: accountId,
          userId
        }
      });
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Deposit account not found or not owned by user');
      }
      throw error;
    }
  }

  /**
   * Delete all accounts by user ID
   */
  async deleteAllByUserId(userId) {
    const result = await this.prisma.depositAccount.deleteMany({
      where: { userId }
    });
    return result.count;
  }

  /**
   * Check if card number exists
   */
  async cardNumberExists(cardNumber) {
    const account = await this.prisma.depositAccount.findUnique({
      where: { cardNumber },
      select: { id: true }
    });
    return !!account;
  }

  /**
   * Update account balance
   */
  async updateBalance(accountId, newBalance) {
    try {
      return await this.prisma.depositAccount.update({
        where: { id: accountId },
        data: { balance: newBalance },
        select: {
          id: true,
          cardNumber: true,
          balance: true,
          updatedAt: true
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Deposit account not found');
      }
      throw error;
    }
  }

  /**
   * Get account statistics for a user
   */
  async getUserAccountStats(userId) {
    const totalAccounts = await this.prisma.depositAccount.count({
      where: { userId }
    });

    const totalBalance = await this.prisma.depositAccount.aggregate({
      where: { userId },
      _sum: { balance: true }
    });

    const totalScore = await this.prisma.depositAccount.aggregate({
      where: { userId },
      _sum: { scoreAmount: true }
    });

    return {
      totalAccounts,
      totalBalance: totalBalance._sum.balance || 0,
      totalScore: totalScore._sum.scoreAmount || 0
    };
  }

  /**
   * Find accounts that need instalment payment (for demo purposes)
   */
  async findAccountsWithUpcomingInstalments() {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    return await this.prisma.depositAccount.findMany({
      where: {
        upcomingInstalmentDueDate: {
          lte: today
        },
        upcomingInstalmentAmount: {
          gt: 0
        }
      },
      select: {
        id: true,
        userId: true,
        cardNumber: true,
        upcomingInstalmentAmount: true,
        upcomingInstalmentDueDate: true,
        user: {
          select: {
            phoneNumber: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  /**
   * Update upcoming instalment
   */
  async updateUpcomingInstalment(accountId, amount, dueDate) {
    try {
      return await this.prisma.depositAccount.update({
        where: { id: accountId },
        data: {
          upcomingInstalmentAmount: amount,
          upcomingInstalmentDueDate: dueDate
        },
        select: {
          id: true,
          cardNumber: true,
          upcomingInstalmentAmount: true,
          upcomingInstalmentDueDate: true,
          updatedAt: true
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Deposit account not found');
      }
      throw error;
    }
  }
}

export default new DepositAccountRepository();