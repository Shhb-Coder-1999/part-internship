/**
 * Environment configuration management
 * Centralized configuration for all apps
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Base configuration for all apps
 */
export const baseConfig = {
  // Server configuration
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 3000,
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true'
    }
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/comment',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // limit each IP to 100 requests per windowMs
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  }
};

/**
 * App-specific configurations
 */
export const appConfigs = {
  comments: {
    port: process.env.COMMENTS_PORT || 3000,
    name: 'Comments API',
    version: '1.0.0'
  },
  
  userManagement: {
    port: process.env.USER_MANAGEMENT_PORT || 3001,
    name: 'User Management API',
    version: '1.0.0'
  },
  
  sahab: {
    port: process.env.SAHAB_PORT || 3002,
    name: 'Sahab API',
    version: '1.0.0'
  }
};

/**
 * Get configuration for a specific app
 * @param {string} appName - Name of the app
 * @returns {Object} App-specific configuration
 */
export const getAppConfig = (appName) => {
  const appConfig = appConfigs[appName];
  if (!appConfig) {
    throw new Error(`Unknown app: ${appName}`);
  }
  
  return {
    ...baseConfig,
    ...appConfig,
    server: {
      ...baseConfig.server,
      port: appConfig.port
    }
  };
};

/**
 * Validate required environment variables
 * @param {string[]} requiredVars - Array of required environment variable names
 * @throws {Error} If any required variables are missing
 */
export const validateEnvironment = (requiredVars = []) => {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Check if running in development mode
 * @returns {boolean} True if in development mode
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if running in production mode
 * @returns {boolean} True if in production mode
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if running in test mode
 * @returns {boolean} True if in test mode
 */
export const isTest = () => {
  return process.env.NODE_ENV === 'test';
}; 