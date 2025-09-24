/**
 * Transaction Service - Business logic for transactions
 */

import { ValidationError, NotFoundError } from '@shared/core/utils';
import { TransactionRepository, DepositAccountRepository } from '#app/repositories';
import { calculatePaginationMeta } from '#app/utils';
import { API_MESSAGES, DB_ENUMS } from '#app/constants';

export class TransactionService {
  constructor() {
    this.transactionRepository = TransactionRepository;
    this.accountRepository = DepositAccountRepository;
  }

  /**
   * Get user's transactions with filtering and pagination
   */
  async getUserTransactions(userId, filters = {}, page = 1, pageSize = 20) {
    // Validate filters
    const validation = this.validateTransactionFilters(filters);
    if (!validation.isValid) {
      throw new ValidationError(API_MESSAGES.ERROR.VALIDATION_FAILED, validation.errors);
    }

    // Convert string type to enum
    const normalizedFilters = { ...filters };
    if (normalizedFilters.type) {
      normalizedFilters.type = normalizedFilters.type.toUpperCase();
    }

    // Get transactions
    const { transactions, total } = await this.transactionRepository.findByUserId(
      userId, 
      normalizedFilters, 
      page, 
      pageSize
    );

    // Format response
    const formattedTransactions = transactions.map(transaction => this.formatTransactionResponse(transaction));
    const paginationMeta = calculatePaginationMeta(page, pageSize, total);

    return {
      transactions: formattedTransactions,
      meta: paginationMeta
    };
  }

  /**
   * Get transactions for a specific account
   */
  async getAccountTransactions(accountId, userId, filters = {}, page = 1, pageSize = 20) {
    // Verify account exists and belongs to user
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError(API_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
    }

    // Validate filters
    const validation = this.validateTransactionFilters(filters);
    if (!validation.isValid) {
      throw new ValidationError(API_MESSAGES.ERROR.VALIDATION_FAILED, validation.errors);
    }

    // Convert string type to enum
    const normalizedFilters = { ...filters };
    if (normalizedFilters.type) {
      normalizedFilters.type = normalizedFilters.type.toUpperCase();
    }

    // Get transactions
    const { transactions, total } = await this.transactionRepository.findByAccountId(
      accountId, 
      normalizedFilters, 
      page, 
      pageSize
    );

    // Format response
    const formattedTransactions = transactions.map(transaction => this.formatTransactionResponse(transaction));
    const paginationMeta = calculatePaginationMeta(page, pageSize, total);

    return {
      transactions: formattedTransactions,
      meta: paginationMeta
    };
  }

  /**
   * Create a new transaction (for demo/admin purposes)
   */
  async createTransaction(accountId, transactionData) {
    // Validate transaction data
    const validation = this.validateTransactionData(transactionData);
    if (!validation.isValid) {
      throw new ValidationError(API_MESSAGES.ERROR.VALIDATION_FAILED, validation.errors);
    }

    // Check if account exists
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError(API_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
    }

    // For withdrawals, check if account has sufficient balance
    if (transactionData.type.toUpperCase() === 'WITHDRAW' && account.balance < transactionData.amount) {
      throw new ValidationError('Insufficient account balance');
    }

    // Create transaction
    const transaction = await this.transactionRepository.createTransaction({
      accountId,
      type: transactionData.type.toUpperCase(),
      amount: transactionData.amount,
      date: transactionData.date ? new Date(transactionData.date) : new Date()
    });

    // Update account balance
    let newBalance = account.balance;
    if (transaction.type === 'DEPOSIT') {
      newBalance += transaction.amount;
    } else if (transaction.type === 'WITHDRAW') {
      newBalance -= transaction.amount;
    }

    await this.accountRepository.updateBalance(accountId, newBalance);

    return this.formatTransactionResponse(transaction);
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId, userId) {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Verify transaction belongs to user's account
    const account = await this.accountRepository.findByIdAndUserId(transaction.accountId, userId);
    if (!account) {
      throw new NotFoundError('Transaction not found or not accessible');
    }

    return this.formatTransactionResponse(transaction);
  }

  /**
   * Get user transaction statistics
   */
  async getUserTransactionStats(userId) {
    return await this.transactionRepository.getUserTransactionStats(userId);
  }

  /**
   * Get account transaction statistics
   */
  async getAccountTransactionStats(accountId, userId) {
    // Verify account belongs to user
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError(API_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
    }

    return await this.transactionRepository.getAccountTransactionStats(accountId);
  }

  /**
   * Get recent transactions for user
   */
  async getRecentTransactions(userId, limit = 10) {
    const transactions = await this.transactionRepository.getRecentTransactions(userId, limit);
    return transactions.map(transaction => ({
      ...this.formatTransactionResponse(transaction),
      cardNumber: transaction.account?.cardNumber
    }));
  }

  /**
   * Validate transaction filters
   */
  validateTransactionFilters(filters) {
    const errors = [];

    // Validate type
    if (filters.type && !['deposit', 'withdraw'].includes(filters.type.toLowerCase())) {
      errors.push({
        field: 'type',
        message: {
          fa: 'نوع تراکنش باید deposit یا withdraw باشد',
          en: 'Transaction type must be deposit or withdraw'
        }
      });
    }

    // Validate date range
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        errors.push({
          field: 'date',
          message: {
            fa: 'فرمت تاریخ نامعتبر است',
            en: 'Invalid date format'
          }
        });
      } else if (startDate > endDate) {
        errors.push({
          field: 'date',
          message: {
            fa: 'تاریخ شروع نباید بعد از تاریخ پایان باشد',
            en: 'Start date must not be after end date'
          }
        });
      }
    }

    // Validate amount range
    if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
      const minAmount = parseInt(filters.minAmount);
      const maxAmount = parseInt(filters.maxAmount);
      
      if (isNaN(minAmount) || isNaN(maxAmount) || minAmount < 0 || maxAmount < 0) {
        errors.push({
          field: 'amount',
          message: {
            fa: 'مقادیر مبلغ باید عدد مثبت باشند',
            en: 'Amount values must be positive numbers'
          }
        });
      } else if (minAmount > maxAmount) {
        errors.push({
          field: 'amount',
          message: {
            fa: 'حداقل مبلغ نباید بیشتر از حداکثر مبلغ باشد',
            en: 'Minimum amount must not be greater than maximum amount'
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate transaction data for creation
   */
  validateTransactionData(data) {
    const errors = [];

    if (!data.type || !['deposit', 'withdraw'].includes(data.type.toLowerCase())) {
      errors.push({
        field: 'type',
        message: 'Transaction type must be deposit or withdraw'
      });
    }

    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Amount must be a positive number'
      });
    }

    if (data.date && isNaN(new Date(data.date).getTime())) {
      errors.push({
        field: 'date',
        message: 'Invalid date format'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format transaction response according to PRD specification
   */
  formatTransactionResponse(transaction) {
    return {
      transactionId: transaction.id,
      accountId: transaction.accountId,
      type: transaction.type.toLowerCase(), // Convert to lowercase as per PRD
      date: transaction.date.toISOString(),
      amount: transaction.amount
    };
  }

  /**
   * Process bulk transactions (admin/system function)
   */
  async processBulkTransactions(transactions) {
    const results = [];
    
    for (const txData of transactions) {
      try {
        const result = await this.createTransaction(txData.accountId, {
          type: txData.type,
          amount: txData.amount,
          date: txData.date
        });
        results.push({ success: true, transaction: result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          accountId: txData.accountId 
        });
      }
    }

    return results;
  }
}

export default new TransactionService();