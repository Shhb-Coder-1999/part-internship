/**
 * Authentication Service - Business logic for user authentication
 */

import { passwordService, jwtService } from '@shared/core/auth';
import { UnauthorizedError, ConflictError, ValidationError } from '@shared/core/utils';
import { UserRepository } from '#app/repositories';
import { 
  validatePhoneNumber, 
  validateName, 
  validateIdNumber, 
  validatePassword,
  normalizePhoneNumber,
  sanitizeInput 
} from '#app/utils';
import { API_MESSAGES, DB_ENUMS } from '#app/constants';

export class AuthService {
  constructor() {
    this.userRepository = UserRepository;
  }

  /**
   * Register a new user
   */
  async signUp(userData) {
    // Validate input data
    const validation = this.validateSignUpData(userData);
    if (!validation.isValid) {
      throw new ValidationError(API_MESSAGES.ERROR.VALIDATION_FAILED, validation.errors);
    }

    // Normalize and sanitize data
    const normalizedData = {
      firstName: sanitizeInput(userData.firstName),
      lastName: sanitizeInput(userData.lastName),
      idNumber: userData.idNumber.trim(),
      phoneNumber: normalizePhoneNumber(userData.phoneNumber),
      password: userData.password
    };

    // Check if phone number already exists
    const existingUser = await this.userRepository.findByPhoneNumber(normalizedData.phoneNumber);
    if (existingUser) {
      throw new ConflictError(API_MESSAGES.ERROR.PHONE_EXISTS);
    }

    // Hash password
    const passwordHash = await passwordService.hashPassword(normalizedData.password);

    // Create user
    const user = await this.userRepository.createUser({
      ...normalizedData,
      passwordHash,
      status: DB_ENUMS.USER_STATUS.ACTIVE
    });

    // Return user data without password
    return {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt
    };
  }

  /**
   * Authenticate user and generate token
   */
  async login(credentials) {
    // Validate input data
    const validation = this.validateLoginData(credentials);
    if (!validation.isValid) {
      throw new ValidationError(API_MESSAGES.ERROR.VALIDATION_FAILED, validation.errors);
    }

    const normalizedPhoneNumber = normalizePhoneNumber(credentials.phoneNumber);

    // Find user with password
    const user = await this.userRepository.findByPhoneNumberWithPassword(normalizedPhoneNumber);
    if (!user) {
      throw new UnauthorizedError(API_MESSAGES.ERROR.INVALID_CREDENTIALS);
    }

    // Check if user is active
    if (user.status !== DB_ENUMS.USER_STATUS.ACTIVE) {
      throw new UnauthorizedError('User account is not active');
    }

    // Verify password
    const isPasswordValid = await passwordService.verifyPassword(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError(API_MESSAGES.ERROR.INVALID_CREDENTIALS);
    }

    // Generate JWT token
    const tokenData = jwtService.createUserToken({
      id: user.id,
      email: user.phoneNumber, // Using phone as email for compatibility
      firstName: user.firstName,
      lastName: user.lastName,
      roles: ['user'] // Default role
    });

    return {
      token: tokenData.token,
      expiresIn: tokenData.expiresIn,
      user: {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };
  }

  /**
   * Logout user (in a real implementation, this would invalidate the token)
   */
  async logout(token) {
    // In this implementation, we don't maintain a token blacklist
    // The token will expire naturally
    // In a production system, you might want to:
    // 1. Add token to a blacklist
    // 2. Store active sessions in Redis
    // 3. Use shorter token expiry times with refresh tokens
    
    return { success: true };
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError(API_MESSAGES.ERROR.USER_NOT_FOUND);
    }

    return {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Validate sign-up data
   */
  validateSignUpData(data) {
    const errors = [];

    if (!validateName(data.firstName)) {
      errors.push({
        field: 'firstName',
        message: {
          fa: 'نام باید بین ۱ تا ۱۰۰ کاراکتر باشد و فقط شامل حروف، فاصله و خط تیره باشد',
          en: 'First name must be 1-100 characters and contain only letters, spaces, and hyphens'
        }
      });
    }

    if (!validateName(data.lastName)) {
      errors.push({
        field: 'lastName',
        message: {
          fa: 'نام خانوادگی باید بین ۱ تا ۱۰۰ کاراکتر باشد و فقط شامل حروف، فاصله و خط تیره باشد',
          en: 'Last name must be 1-100 characters and contain only letters, spaces, and hyphens'
        }
      });
    }

    if (!validateIdNumber(data.idNumber)) {
      errors.push({
        field: 'idNumber',
        message: {
          fa: 'کد ملی باید بین ۱۰ تا ۲۰ رقم باشد',
          en: 'ID number must be 10-20 digits'
        }
      });
    }

    if (!validatePhoneNumber(data.phoneNumber)) {
      errors.push({
        field: 'phoneNumber',
        message: {
          fa: 'شماره تلفن باید با ۰۹ شروع شده و ۱۱ رقم باشد',
          en: 'Phone number must start with 09 and be 11 digits'
        }
      });
    }

    if (!validatePassword(data.password)) {
      errors.push({
        field: 'password',
        message: {
          fa: 'رمز عبور باید بین ۶ تا ۱۲۸ کاراکتر باشد',
          en: 'Password must be 6-128 characters'
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate login data
   */
  validateLoginData(data) {
    const errors = [];

    if (!validatePhoneNumber(data.phoneNumber)) {
      errors.push({
        field: 'phoneNumber',
        message: {
          fa: 'شماره تلفن باید با ۰۹ شروع شده و ۱۱ رقم باشد',
          en: 'Phone number must start with 09 and be 11 digits'
        }
      });
    }

    if (!data.password || typeof data.password !== 'string') {
      errors.push({
        field: 'password',
        message: {
          fa: 'رمز عبور الزامی است',
          en: 'Password is required'
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Validate new password
    if (!validatePassword(newPassword)) {
      throw new ValidationError('New password does not meet requirements');
    }

    // Get user with current password
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError(API_MESSAGES.ERROR.USER_NOT_FOUND);
    }

    const userWithPassword = await this.userRepository.findByPhoneNumberWithPassword(user.phoneNumber);

    // Verify current password
    const isCurrentPasswordValid = await passwordService.verifyPassword(currentPassword, userWithPassword.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await passwordService.hashPassword(newPassword);

    // Update password
    await this.userRepository.updatePassword(userId, newPasswordHash);

    return { success: true };
  }

  /**
   * Update user status (admin function)
   */
  async updateUserStatus(userId, status) {
    if (!Object.values(DB_ENUMS.USER_STATUS).includes(status)) {
      throw new ValidationError('Invalid user status');
    }

    const updatedUser = await this.userRepository.updateStatus(userId, status);
    
    return {
      userId: updatedUser.id,
      phoneNumber: updatedUser.phoneNumber,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      status: updatedUser.status,
      updatedAt: updatedUser.updatedAt
    };
  }
}

export default new AuthService();