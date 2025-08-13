/**
 * Authentication middleware
 * Common authentication utilities for all apps
 */

import jwt from 'jsonwebtoken';
import { unauthorizedResponse, forbiddenResponse } from '../utils/responses.js';

/**
 * JWT token verification middleware
 * @param {string} secret - JWT secret key
 * @returns {Function} Express middleware function
 */
export const authenticateToken = (secret) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json(unauthorizedResponse('Access token required'));
    }

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json(unauthorizedResponse('Token expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json(unauthorizedResponse('Invalid token'));
      }
      return res.status(500).json(unauthorizedResponse('Token verification failed'));
    }
  };
};

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(unauthorizedResponse('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(forbiddenResponse('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Sets user info if token is provided, but doesn't require it
 * @param {string} secret - JWT secret key
 * @returns {Function} Express middleware function
 */
export const optionalAuth = (secret) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
      } catch (error) {
        // Silently ignore invalid tokens for optional auth
        req.user = null;
      }
    }

    next();
  };
};

/**
 * Rate limiting middleware (basic implementation)
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP'
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(ip)) {
      const userRequests = requests.get(ip).filter(time => time > windowStart);
      requests.set(ip, userRequests);
    }

    const userRequests = requests.get(ip) || [];
    
    if (userRequests.length >= max) {
      return res.status(429).json({
        status: 'error',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequests.push(now);
    requests.set(ip, userRequests);
    next();
  };
}; 