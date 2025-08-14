/**
 * User Controller
 * Handles user-related HTTP requests
 */

import { createAppLogger } from '@shared/core/utils';
import { UserService } from '../services/userService.js';
import { LOG_CONTEXTS, API_MESSAGES, HTTP_STATUS } from '../constants/index.js';

const logger = createAppLogger(LOG_CONTEXTS.CONTROLLER);

export class UserController {
  constructor() {
    this.userService = new UserService();
  }

  async getUsers(request, reply) {
    try {
      const result = await this.userService.getUsers(request.query);
      
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: API_MESSAGES.SUCCESS.USERS_RETRIEVED,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get users', error);
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getUserById(request, reply) {
    try {
      const user = await this.userService.getUserById(request.params.id);
      
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: 'User retrieved successfully',
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get user by ID', error);
      const statusCode = error.message === API_MESSAGES.ERROR.USER_NOT_FOUND 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      return reply.status(statusCode).send({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async createUser(request, reply) {
    try {
      const user = await this.userService.createUser(request.body);
      
      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        message: API_MESSAGES.SUCCESS.USER_CREATED,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to create user', error);
      return reply.status(HTTP_STATUS.BAD_REQUEST).send({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async updateUser(request, reply) {
    try {
      const user = await this.userService.updateUser(request.params.id, request.body);
      
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: API_MESSAGES.SUCCESS.USER_UPDATED,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to update user', error);
      const statusCode = error.message === API_MESSAGES.ERROR.USER_NOT_FOUND 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.BAD_REQUEST;
      
      return reply.status(statusCode).send({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async deleteUser(request, reply) {
    try {
      await this.userService.deleteUser(request.params.id);
      
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: API_MESSAGES.SUCCESS.USER_DELETED,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to delete user', error);
      const statusCode = error.message === API_MESSAGES.ERROR.USER_NOT_FOUND 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      return reply.status(statusCode).send({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async searchUsers(request, reply) {
    try {
      const users = await this.userService.searchUsers(request.query.q, request.query.limit);
      
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: 'Users search completed',
        data: users,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to search users', error);
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}