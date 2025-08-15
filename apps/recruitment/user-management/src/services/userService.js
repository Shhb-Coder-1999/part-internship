/**
 * User Service
 * Business logic for user management
 */

import bcrypt from 'bcryptjs';
import { createAppLogger } from '../../../../../packages/shared/utils/index.js';
import { UserRepository } from '../repositories/userRepository.js';
import { LOG_CONTEXTS, API_MESSAGES, DB_CONFIG } from '../constants/index.js';

const logger = createAppLogger(LOG_CONTEXTS.SERVICE);

export class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(userData) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, DB_CONFIG.PASSWORD_HASH_ROUNDS);
      
      const user = await this.userRepository.createUser({
        ...userData,
        password: hashedPassword,
      });

      logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Failed to create user', error);
      throw error;
    }
  }

  async getUsers(options) {
    try {
      return await this.userRepository.getUsers(options);
    } catch (error) {
      logger.error('Failed to get users', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const user = await this.userRepository.getUserById(id);
      if (!user) {
        throw new Error(API_MESSAGES.ERROR.USER_NOT_FOUND);
      }
      return user;
    } catch (error) {
      logger.error('Failed to get user by ID', error);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      return await this.userRepository.updateUser(id, userData);
    } catch (error) {
      logger.error('Failed to update user', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      return await this.userRepository.deleteUser(id);
    } catch (error) {
      logger.error('Failed to delete user', error);
      throw error;
    }
  }

  async searchUsers(searchTerm, limit) {
    try {
      return await this.userRepository.searchUsers(searchTerm, limit);
    } catch (error) {
      logger.error('Failed to search users', error);
      throw error;
    }
  }
}