/**
 * Authentication Controller - HTTP handlers for auth endpoints
 */

import { AuthService } from '#app/services';
import { createPRDSuccessResponse, createPRDErrorResponse } from '#app/utils';
import { HTTP_STATUS, ERROR_CODES, API_MESSAGES } from '#app/constants';

export class AuthController {
  constructor() {
    this.authService = AuthService;
  }

  /**
   * Sign up a new user
   * POST /auth/sign-up
   */
  async signUp(request, reply) {
    try {
      const userData = await this.authService.signUp(request.body);
      
      const response = createPRDSuccessResponse(userData);
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
      
      if (error.statusCode === 409) {
        const response = createPRDErrorResponse(
          ERROR_CODES.PHONE_EXISTS,
          'شماره تلفن قبلا ثبت شده است',
          'Phone number already exists'
        );
        return reply.status(HTTP_STATUS.CONFLICT).send(response);
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
   * Login user
   * POST /auth/login
   */
  async login(request, reply) {
    try {
      const loginData = await this.authService.login(request.body);
      
      const response = createPRDSuccessResponse(loginData);
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
      
      if (error.statusCode === 401) {
        const response = createPRDErrorResponse(
          ERROR_CODES.INVALID_CREDENTIALS,
          'نام کاربری یا رمز عبور اشتباه است',
          'Invalid credentials'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
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
   * Logout user
   * POST /auth/logout
   */
  async logout(request, reply) {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      await this.authService.logout(token);
      
      return reply.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      request.log.error(error);
      
      if (error.statusCode === 401) {
        const response = createPRDErrorResponse(
          ERROR_CODES.UNAUTHORIZED,
          'توکن نامعتبر یا منقضی شده',
          'Invalid or expired token'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
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
   * Get user profile
   * GET /auth/profile
   */
  async getProfile(request, reply) {
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

      const profile = await this.authService.getUserProfile(userId);
      
      const response = createPRDSuccessResponse(profile);
      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      request.log.error(error);
      
      if (error.statusCode === 401) {
        const response = createPRDErrorResponse(
          ERROR_CODES.USER_NOT_FOUND,
          'کاربر یافت نشد',
          'User not found'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
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
   * Change password
   * POST /auth/change-password
   */
  async changePassword(request, reply) {
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

      const { currentPassword, newPassword } = request.body;
      await this.authService.changePassword(userId, currentPassword, newPassword);
      
      const response = createPRDSuccessResponse({ success: true });
      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error) {
      request.log.error(error);
      
      if (error.statusCode === 400 || error.statusCode === 422) {
        const response = createPRDErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          error.message
        );
        return reply.status(HTTP_STATUS.VALIDATION_ERROR).send(response);
      }
      
      if (error.statusCode === 401) {
        const response = createPRDErrorResponse(
          ERROR_CODES.INVALID_CREDENTIALS,
          'رمز عبور فعلی اشتباه است',
          'Current password is incorrect'
        );
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
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

export default new AuthController();