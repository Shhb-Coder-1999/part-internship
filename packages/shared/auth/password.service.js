/**
 * Centralized Password Service
 * Provides password hashing, verification, and validation functionality
 */

import bcrypt from 'bcryptjs';
import { AUTH_CONSTANTS } from '../constants/index.js';

/**
 * Password Service class for password management
 */
export class PasswordService {
  constructor(saltRounds = 10) {
    this.saltRounds = saltRounds;
  }

  /**
   * Hash a plain text password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify a password against its hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash) {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePassword(password) {
    const result = {
      isValid: false,
      errors: [],
      score: 0,
    };

    if (!password || typeof password !== 'string') {
      result.errors.push('Password must be a string');
      return result;
    }

    // Check minimum length
    if (password.length < AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.MIN_LENGTH) {
      result.errors.push(`Password must be at least ${AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.MIN_LENGTH} characters long`);
    } else {
      result.score += 1;
    }

    // Check maximum length
    if (password.length > AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.MAX_LENGTH) {
      result.errors.push(`Password must not exceed ${AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.MAX_LENGTH} characters`);
    } else {
      result.score += 1;
    }

    // Check for uppercase letter
    if (AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      result.errors.push('Password must contain at least one uppercase letter');
    } else if (AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE) {
      result.score += 1;
    }

    // Check for lowercase letter
    if (AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      result.errors.push('Password must contain at least one lowercase letter');
    } else if (AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE) {
      result.score += 1;
    }

    // Check for number
    if (AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.REQUIRE_NUMBER && !/\d/.test(password)) {
      result.errors.push('Password must contain at least one number');
    } else if (AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.REQUIRE_NUMBER) {
      result.score += 1;
    }

    // Check for special character
    if (AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.errors.push('Password must contain at least one special character');
    } else if (AUTH_CONSTANTS.PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL) {
      result.score += 1;
    }

    // Check for common patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        result.errors.push('Password contains common patterns and is not secure');
        break;
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Generate a random password
   * @param {number} length - Password length
   * @param {Object} options - Generation options
   * @returns {string} Generated password
   */
  generatePassword(length = 12, options = {}) {
    const defaults = {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSpecial: false,
    };

    const config = { ...defaults, ...options };
    
    let charset = '';
    if (config.includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (config.includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (config.includeNumbers) charset += '0123456789';
    if (config.includeSpecial) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) {
      throw new Error('At least one character type must be included');
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  /**
   * Check if password needs rehashing (due to changed salt rounds)
   * @param {string} hash - Current password hash
   * @returns {boolean} True if rehashing is needed
   */
  needsRehash(hash) {
    try {
      const rounds = bcrypt.getRounds(hash);
      return rounds !== this.saltRounds;
    } catch (error) {
      return true; // If we can't get rounds, assume rehash is needed
    }
  }

  /**
   * Get password strength score
   * @param {string} password - Password to score
   * @returns {Object} Strength analysis
   */
  getPasswordStrength(password) {
    const validation = this.validatePassword(password);
    let strength = 'Very Weak';
    
    if (validation.score >= 5) strength = 'Very Strong';
    else if (validation.score >= 4) strength = 'Strong';
    else if (validation.score >= 3) strength = 'Medium';
    else if (validation.score >= 2) strength = 'Weak';

    return {
      strength,
      score: validation.score,
      maxScore: 6,
      isValid: validation.isValid,
      feedback: validation.errors,
    };
  }
}

// Export singleton instance
export const passwordService = new PasswordService();

// Export factory function for custom instances
export const createPasswordService = (saltRounds) => new PasswordService(saltRounds);