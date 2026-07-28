/**
 * Transaction Controller - HTTP handlers for transaction endpoints
 */

import { TransactionService } from '#app/services';
import { createPRDSuccessResponse, createPRDErrorResponse } from '#app/utils';
import { HTTP_STATUS, ERROR_CODES, API_MESSAGES } from '#app/constants';

export class TransactionController {
  constructor() {
    this.transactionService = TransactionService;
  }

  /**
   * Get user's transactions with filtering and pagination
   * GET /transactions
   */
  async getTransactions(request, reply) {
    try {
      const userId = request.user?.id;
      if (!userId) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'کاربر شناسایی نشد',
          'User not identified'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
      }

      const { 
        page = 1, 
        pageSize = 20, 
        type, 
        startDate, 
        endDate, 
        minAmount, 
        maxAmount 
      } = request.query;

      const filters = {};
      if (type) filters.type = type;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (minAmount !== undefined) filters.minAmount = parseInt(minAmount);
      if (maxAmount !== undefined) filters.maxAmount = parseInt(maxAmount);

      const result = await this.transactionService.getUserTransactions(
        userId, 
        filters, 
        parseInt(page), 
        parseInt(pageSize)
      );
      
      const response = createPRDSuccessResponse(result.transactions, result.meta);
      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      request.log.error(error);
      
      if (error.statusCode === 400 || error.statusCode === 422) {
        const response = createPRDErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          error.message,
          error.details
        );
        return reply.status(HTTP_STATUS.VALIDATION_ERROR).send(response);
      }
      
      const response = createPRDErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'خطای داخلی سرور',
        'Internal server error'
      );
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * Get transactions for a specific account
   * GET /deposit-account/:accountId/transactions
   */
  async getAccountTransactions(request, reply) {
    try {
      const userId = request.user?.id;
      if (!userId) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'کاربر شناسایی نشد',
          'User not identified'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
      }

      const { accountId } = request.params;
      const { 
        page = 1, 
        pageSize = 20, 
        type, 
        startDate, 
        endDate, 
        minAmount, 
        maxAmount 
      } = request.query;

      const filters = {};
      if (type) filters.type = type;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (minAmount !== undefined) filters.minAmount = parseInt(minAmount);
      if (maxAmount !== undefined) filters.maxAmount = parseInt(maxAmount);

      const result = await this.transactionService.getAccountTransactions(
        accountId,
        userId, 
        filters, 
        parseInt(page), 
        parseInt(pageSize)
      );
      
      const response = createPRDSuccessResponse(result.transactions, result.meta);
      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      request.log.error(error);
      
      if (error.statusCode === 400 || error.statusCode === 422) {
        const response = createPRDErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          error.message,
          error.details
        );
        return reply.status(HTTP_STATUS.VALIDATION_ERROR).send(response);
      }
      
      if (error.statusCode === 404) {
        const response = createPRDErrorResponse(
          ERROR_CODES.ACCOUNT_NOT_FOUND,
          'حساب سپرده یافت نشد',
          'Deposit account not found'
        );
        return reply.status(HTTP_STATUS.NOT_FOUND).send(response);
      }
      
      const response = createPRDErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'خطای داخلی سرور',
        'Internal server error'
      );
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * Get transaction by ID
   * GET /transactions/:transactionId
   */
  async getTransactionById(request, reply) {
    try {
      const userId = request.user?.id;
      if (!userId) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'کاربر شناسایی نشد',
          'User not identified'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
      }

      const { transactionId } = request.params;
      const transaction = await this.transactionService.getTransactionById(transactionId, userId);
      
      const response = createPRDSuccessResponse(transaction);
      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      request.log.error(error);
      
      if (error.statusCode === 404) {
        const response = createPRDErrorResponse(
          ERROR_CODES.ACCOUNT_NOT_FOUND,
          'تراکنش یافت نشد',
          'Transaction not found'
        );
        return reply.status(HTTP_STATUS.NOT_FOUND).send(response);
      }
      
      const response = createPRDErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'خطای داخلی سرور',
        'Internal server error'
      );
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * Get user transaction statistics
   * GET /transactions/stats
   */
  async getTransactionStats(request, reply) {
    try {
      const userId = request.user?.id;
      if (!userId) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'کاربر شناسایی نشد',
          'User not identified'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
      }

      const stats = await this.transactionService.getUserTransactionStats(userId);
      
      const response = createPRDSuccessResponse(stats);
      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      request.log.error(error);
      
      const response = createPRDErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'خطای داخلی سرور',
        'Internal server error'
      );
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * Get account transaction statistics
   * GET /deposit-account/:accountId/transactions/stats
   */
  async getAccountTransactionStats(request, reply) {
    try {
      const userId = request.user?.id;
      if (!userId) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'کاربر شناسایی نشد',
          'User not identified'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
      }

      const { accountId } = request.params;
      const stats = await this.transactionService.getAccountTransactionStats(accountId, userId);
      
      const response = createPRDSuccessResponse(stats);
      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      request.log.error(error);
      
      if (error.statusCode === 404) {
        const response = createPRDErrorResponse(
          ERROR_CODES.ACCOUNT_NOT_FOUND,
          'حساب سپرده یافت نشد',
          'Deposit account not found'
        );
        return reply.status(HTTP_STATUS.NOT_FOUND).send(response);
      }
      
      const response = createPRDErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'خطای داخلی سرور',
        'Internal server error'
      );
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * Get recent transactions
   * GET /transactions/recent
   */
  async getRecentTransactions(request, reply) {
    try {
      const userId = request.user?.id;
      if (!userId) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'کاربر شناسایی نشد',
          'User not identified'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
      }

      const { limit = 10 } = request.query;
      const transactions = await this.transactionService.getRecentTransactions(userId, parseInt(limit));
      
      const response = createPRDSuccessResponse(transactions);
      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      request.log.error(error);
      
      const response = createPRDErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'خطای داخلی سرور',
        'Internal server error'
      );
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * Create a new transaction (admin/demo endpoint)
   * POST /deposit-account/:accountId/transactions
   */
  async createTransaction(request, reply) {
    try {
      const userId = request.user?.id;
      if (!userId) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'کاربر شناسایی نشد',
          'User not identified'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
      }

      const { accountId } = request.params;
      const transaction = await this.transactionService.createTransaction(accountId, request.body);
      
      const response = createPRDSuccessResponse(transaction);
      return reply.status(HTTP_STATUS.CREATED).send(response);
    } catch (error) {
      request.log.error(error);
      
      if (error.statusCode === 400 || error.statusCode === 422) {
        const response = createPRDErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          error.message,
          error.details
        );
        return reply.status(HTTP_STATUS.VALIDATION_ERROR).send(response);
      }
      
      if (error.statusCode === 404) {
        const response = createPRDErrorResponse(
          ERROR_CODES.ACCOUNT_NOT_FOUND,
          'حساب سپرده یافت نشد',
          'Deposit account not found'
        );
        return reply.status(HTTP_STATUS.NOT_FOUND).send(response);
      }
      
      const response = createPRDErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'خطای داخلی سرور',
        'Internal server error'
      );
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(response);
    }
  }
}

export default new TransactionController();