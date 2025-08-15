/**
 * Centralized JWT Service
 * Provides JWT token generation, verification, and validation functionality
 */

import jwt from 'jsonwebtoken';
import { ENV_VARS, AUTH_CONSTANTS } from '../constants/index.js';

/**
 * JWT Service class for token management
 */
export class JWTService {
  constructor(secret = null) {
    this.secret = secret || process.env[ENV_VARS.JWT_SECRET] || AUTH_CONSTANTS.JWT_DEFAULTS.ISSUER;
    this.defaultOptions = {
      issuer: AUTH_CONSTANTS.JWT_DEFAULTS.ISSUER,
      audience: AUTH_CONSTANTS.JWT_DEFAULTS.AUDIENCE,
      expiresIn: AUTH_CONSTANTS.JWT_DEFAULTS.EXPIRES_IN,
    };
  }

  /**
   * Generate JWT token
   * @param {Object} payload - Token payload
   * @param {Object} options - Token options (optional)
   * @returns {string} JWT token
   */
  generateToken(payload, options = {}) {
    const tokenOptions = {
      ...this.defaultOptions,
      ...options,
    };

    return jwt.sign(payload, this.secret, tokenOptions);
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @param {Object} options - Verification options (optional)
   * @returns {Object} Decoded payload
   * @throws {Error} If token is invalid
   */
  verifyToken(token, options = {}) {
    const verifyOptions = {
      issuer: AUTH_CONSTANTS.JWT_DEFAULTS.ISSUER,
      audience: AUTH_CONSTANTS.JWT_DEFAULTS.AUDIENCE,
      ...options,
    };

    return jwt.verify(token, this.secret, verifyOptions);
  }

  /**
   * Decode JWT token without verification
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded payload
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if expired
   */
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded.exp) return false;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Extracted token or null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    
    if (!authHeader.startsWith('Bearer ')) return null;
    
    return authHeader.substring(7); // Remove "Bearer " prefix
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} Refresh token
   */
  generateRefreshToken(payload) {
    return this.generateToken(payload, {
      expiresIn: AUTH_CONSTANTS.JWT_DEFAULTS.REFRESH_EXPIRES_IN,
    });
  }

  /**
   * Validate token and return user context
   * @param {string} token - JWT token
   * @returns {Object} User context or null
   */
  validateTokenAndGetUser(token) {
    try {
      const decoded = this.verifyToken(token);
      return {
        id: decoded.id,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Create token for user
   * @param {Object} user - User object
   * @param {Object} options - Token options
   * @returns {Object} Token data
   */
  createUserToken(user, options = {}) {
    const payload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles || [],
      permissions: user.permissions || [],
    };

    const token = this.generateToken(payload, options);
    const refreshToken = this.generateRefreshToken({ id: user.id, email: user.email });

    return {
      token,
      refreshToken,
      expiresIn: options.expiresIn || AUTH_CONSTANTS.JWT_DEFAULTS.EXPIRES_IN,
      tokenType: 'Bearer',
    };
  }
}

// Export singleton instance
export const jwtService = new JWTService();

// Export factory function for custom instances
export const createJWTService = (secret) => new JWTService(secret);