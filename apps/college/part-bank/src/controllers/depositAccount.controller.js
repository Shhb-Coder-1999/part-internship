/**
 * Deposit Account Controller - HTTP handlers for deposit account endpoints
 */

import { DepositAccountService } from '#app/services';
import { createPRDSuccessResponse, createPRDErrorResponse } from '#app/utils';
import { HTTP_STATUS, ERROR_CODES, API_MESSAGES } from '#app/constants';

export class DepositAccountController {
  constructor() {
    this.accountService = DepositAccountService;
  }

  /**
   * Create a new deposit account
   * POST /deposit-account
   */
  async createAccount(request, reply) {
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

      // Handle multipart form data
      const data = await request.file();
      if (!data) {
        const response = createPRDErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'فایل تصویر کارت ملی الزامی است',
          'National card image file is required'
        );
        return reply.status(HTTP_STATUS.BAD_REQUEST).send(response);
      }

      // Extract form fields
      const fields = data.fields;
      const accountData = {
        firstName: fields.firstName?.value,
        lastName: fields.lastName?.value,
        address: fields.address?.value,
        postalCode: fields.postalCode?.value
      };

      // Extract file data
      const fileData = {
        filename: data.filename,
        mimetype: data.mimetype,
        size: parseInt(data.fields.size?.value || '0'),
        buffer: await data.toBuffer() // In production, you'd stream this to storage
      };

      const account = await this.accountService.createAccount(userId, accountData, fileData);
      
      const response = createPRDSuccessResponse(account);
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
      
      if (error.statusCode === 413) {
        const response = createPRDErrorResponse(
          ERROR_CODES.FILE_TOO_LARGE,
          'حجم فایل بیش از حد مجاز است',
          'File size exceeds maximum allowed size'
        );
        return reply.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).send(response);
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
   * Get user's deposit accounts
   * GET /deposit-account
   */
  async getAccounts(request, reply) {
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

      const { page = 1, pageSize = 50 } = request.query;
      const result = await this.accountService.getUserAccounts(userId, parseInt(page), parseInt(pageSize));
      
      const response = createPRDSuccessResponse(result.accounts, result.meta);
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
   * Delete deposit account(s)
   * DELETE /deposit-account
   */
  async deleteAccounts(request, reply) {
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

      const { accountId } = request.query;

      if (accountId) {
        // Delete specific account
        await this.accountService.deleteAccount(userId, accountId);
      } else {
        // Delete all accounts
        await this.accountService.deleteAllAccounts(userId);
      }
      
      return reply.status(HTTP_STATUS.NO_CONTENT).send();
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
   * Get specific account by ID
   * GET /deposit-account/:accountId
   */
  async getAccountById(request, reply) {
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
      const account = await this.accountService.getAccountById(accountId, userId);
      
      const response = createPRDSuccessResponse(account);
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
   * Get user account statistics
   * GET /deposit-account/stats
   */
  async getAccountStats(request, reply) {
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

      const stats = await this.accountService.getUserAccountStats(userId);
      
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
}

export default new DepositAccountController();