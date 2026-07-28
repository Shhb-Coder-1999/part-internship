/**
 * Transaction Repository - Database operations for transactions
 */

import { prismaClient } from '#app/clients';
import { NotFoundError } from '@shared/core/utils';

export class TransactionRepository {
  constructor() {
    this.prisma = prismaClient;
  }

  /**
   * Create a new transaction
   */
  async createTransaction(transactionData) {
    return await this.prisma.transaction.create({
      data: {
        accountId: transactionData.accountId,
        type: transactionData.type,
        amount: transactionData.amount,
        date: transactionData.date || new Date()
      },
      select: {
        id: true,
        accountId: true,
        type: true,
        amount: true,
        date: true
      }
    });
  }

  /**
   * Find transactions by user ID with filtering and pagination
   */
  async findByUserId(userId, filters = {}, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    
    // First, get user's account IDs
    const userAccounts = await this.prisma.depositAccount.findMany({
      where: { userId },
      select: { id: true }
    });

    if (userAccounts.length === 0) {
      return { transactions: [], total: 0 };
    }

    const accountIds = userAccounts.map(acc => acc.id);

    // Build where clause
    const where = {
      accountId: { in: accountIds }
    };

    // Add filters
    if (filters.type) {
      where.type = filters.type.toUpperCase();
    }

    if (filters.startDate && filters.endDate) {
      where.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate)
      };
    } else if (filters.startDate) {
      where.date = {
        gte: new Date(filters.startDate)
      };
    } else if (filters.endDate) {
      where.date = {
        lte: new Date(filters.endDate)
      };
    }

    if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
      where.amount = {
        gte: filters.minAmount,
        lte: filters.maxAmount
      };
    } else if (filters.minAmount !== undefined) {
      where.amount = {
        gte: filters.minAmount
      };
    } else if (filters.maxAmount !== undefined) {
      where.amount = {
        lte: filters.maxAmount
      };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        select: {
          id: true,
          accountId: true,
          type: true,
          amount: true,
          date: true
        },
        orderBy: [
          { date: 'desc' },
          { id: 'desc' }
        ],
        skip,
        take: pageSize
      }),
      this.prisma.transaction.count({ where })
    ]);

    return { transactions, total };
  }

  /**
   * Find transactions by account ID with filtering and pagination
   */
  async findByAccountId(accountId, filters = {}, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    
    // Build where clause
    const where = { accountId };

    // Add filters
    if (filters.type) {
      where.type = filters.type.toUpperCase();
    }

    if (filters.startDate && filters.endDate) {
      where.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate)
      };
    } else if (filters.startDate) {
      where.date = {
        gte: new Date(filters.startDate)
      };
    } else if (filters.endDate) {
      where.date = {
        lte: new Date(filters.endDate)
      };
    }

    if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
      where.amount = {
        gte: filters.minAmount,
        lte: filters.maxAmount
      };
    } else if (filters.minAmount !== undefined) {
      where.amount = {
        gte: filters.minAmount
      };
    } else if (filters.maxAmount !== undefined) {
      where.amount = {
        lte: filters.maxAmount
      };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        select: {
          id: true,
          accountId: true,
          type: true,
          amount: true,
          date: true
        },
        orderBy: [
          { date: 'desc' },
          { id: 'desc' }
        ],
        skip,
        take: pageSize
      }),
      this.prisma.transaction.count({ where })
    ]);

    return { transactions, total };
  }

  /**
   * Find transaction by ID
   */
  async findById(transactionId) {
    return await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        accountId: true,
        type: true,
        amount: true,
        date: true,
        account: {
          select: {
            userId: true,
            cardNumber: true
          }
        }
      }
    });
  }

  /**
   * Get transaction statistics for a user
   */
  async getUserTransactionStats(userId) {
    // Get user's account IDs
    const userAccounts = await this.prisma.depositAccount.findMany({
      where: { userId },
      select: { id: true }
    });

    if (userAccounts.length === 0) {
      return {
        totalTransactions: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        depositAmount: 0,
        withdrawalAmount: 0
      };
    }

    const accountIds = userAccounts.map(acc => acc.id);

    const [
      totalTransactions,
      depositStats,
      withdrawalStats
    ] = await Promise.all([
      this.prisma.transaction.count({
        where: { accountId: { in: accountIds } }
      }),
      this.prisma.transaction.aggregate({
        where: {
          accountId: { in: accountIds },
          type: 'DEPOSIT'
        },
        _count: { id: true },
        _sum: { amount: true }
      }),
      this.prisma.transaction.aggregate({
        where: {
          accountId: { in: accountIds },
          type: 'WITHDRAW'
        },
        _count: { id: true },
        _sum: { amount: true }
      })
    ]);

    return {
      totalTransactions,
      totalDeposits: depositStats._count.id,
      totalWithdrawals: withdrawalStats._count.id,
      depositAmount: depositStats._sum.amount || 0,
      withdrawalAmount: withdrawalStats._sum.amount || 0
    };
  }

  /**
   * Get transaction statistics for an account
   */
  async getAccountTransactionStats(accountId) {
    const [
      totalTransactions,
      depositStats,
      withdrawalStats,
      lastTransaction
    ] = await Promise.all([
      this.prisma.transaction.count({
        where: { accountId }
      }),
      this.prisma.transaction.aggregate({
        where: {
          accountId,
          type: 'DEPOSIT'
        },
        _count: { id: true },
        _sum: { amount: true }
      }),
      this.prisma.transaction.aggregate({
        where: {
          accountId,
          type: 'WITHDRAW'
        },
        _count: { id: true },
        _sum: { amount: true }
      }),
      this.prisma.transaction.findFirst({
        where: { accountId },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          type: true,
          amount: true,
          date: true
        }
      })
    ]);

    return {
      totalTransactions,
      totalDeposits: depositStats._count.id,
      totalWithdrawals: withdrawalStats._count.id,
      depositAmount: depositStats._sum.amount || 0,
      withdrawalAmount: withdrawalStats._sum.amount || 0,
      lastTransaction
    };
  }

  /**
   * Delete all transactions for an account
   */
  async deleteByAccountId(accountId) {
    const result = await this.prisma.transaction.deleteMany({
      where: { accountId }
    });
    return result.count;
  }

  /**
   * Get recent transactions for a user (last 10)
   */
  async getRecentTransactions(userId, limit = 10) {
    // Get user's account IDs
    const userAccounts = await this.prisma.depositAccount.findMany({
      where: { userId },
      select: { id: true }
    });

    if (userAccounts.length === 0) {
      return [];
    }

    const accountIds = userAccounts.map(acc => acc.id);

    return await this.prisma.transaction.findMany({
      where: { accountId: { in: accountIds } },
      select: {
        id: true,
        accountId: true,
        type: true,
        amount: true,
        date: true,
        account: {
          select: {
            cardNumber: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { id: 'desc' }
      ],
      take: limit
    });
  }
}

export default new TransactionRepository();