import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import {
  HTTP_STATUS,
  USER_ROLES,
  PERMISSIONS,
  AUTH_CONSTANTS,
} from '@shared/core/constants';
import { createEnvLoader } from '@shared/core/utils/env.utils';
import { serviceRegistry } from '../core/service-registry.js';

// Load gateway environment configuration
const envLoader = createEnvLoader(process.cwd(), '.env');

/**
 * Generic Authentication Middleware
 * Uses service registry for dynamic route protection
 */

// Configure JWT Strategy for Passport
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: envLoader.get('JWT_SECRET', AUTH_CONSTANTS.JWT_DEFAULTS.ISSUER),
  issuer: envLoader.get('JWT_ISSUER', AUTH_CONSTANTS.JWT_DEFAULTS.ISSUER),
  audience: envLoader.get('JWT_AUDIENCE', AUTH_CONSTANTS.JWT_DEFAULTS.AUDIENCE),
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // In a real app, you'd fetch user from database
      const user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles || [USER_ROLES.USER],
        permissions: payload.permissions || [],
      };

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

/**
 * Generic authentication middleware that uses service registry
 */
export const authenticate = (req, res, next) => {
  const path = req.path;
  const method = req.method;

  // Get route configuration from service registry
  const authConfig = serviceRegistry.getRouteAuth(path, method);

  // If route is public or no auth required, skip authentication
  if (authConfig.isPublic || !authConfig.requireAuth) {
    return next();
  }

  // Use passport JWT authentication
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Authentication error',
        message: 'Internal server error during authentication',
        code: 'AUTH_INTERNAL_ERROR',
      });
    }

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Authentication required',
        message: 'Valid authentication token required',
        path: path,
        code: 'AUTH_TOKEN_REQUIRED',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Generic authorization middleware that uses service registry
 */
export const authorize = (req, res, next) => {
  const path = req.path;
  const method = req.method;

  // Get route configuration from service registry
  const authConfig = serviceRegistry.getRouteAuth(path, method);

  // If no roles required, allow access
  if (!authConfig.requireRoles || authConfig.requireRoles.length === 0) {
    return next();
  }

  // Check if user is authenticated
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Authentication required',
      message: 'Authentication required for this resource',
      code: 'AUTH_REQUIRED',
    });
  }

  // Check if user has required roles
  const userRoles = req.user.roles || [];
  const requiredRoles = authConfig.requireRoles;

  // Admin role has access to everything
  const hasRequiredRole =
    userRoles.includes(USER_ROLES.ADMIN) ||
    requiredRoles.some((role) => userRoles.includes(role));

  if (!hasRequiredRole) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Insufficient permissions',
      message: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      userRoles: userRoles,
      requiredRoles: requiredRoles,
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }

  next();
};

/**
 * Combined authentication and authorization middleware
 */
export const authMiddleware = (req, res, next) => {
  const path = req.path;
  const method = req.method;

  // Get route configuration from service registry
  const authConfig = serviceRegistry.getRouteAuth(path, method);

  // If route is public, skip all auth
  if (authConfig.isPublic || !authConfig.requireAuth) {
    return next();
  }

  // Apply authentication first
  authenticate(req, res, (err) => {
    if (err) return next(err);

    // Then apply authorization
    authorize(req, res, next);
  });
};

/**
 * Public routes middleware (explicitly bypass auth)
 */
export const publicRoute = (req, res, next) => {
  // Mark route as explicitly public
  req.isPublicRoute = true;
  next();
};

/**
 * Admin-only middleware
 */
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Authentication required',
      message: 'Administrator authentication required',
      code: 'ADMIN_AUTH_REQUIRED',
    });
  }

  if (!req.user.roles.includes(USER_ROLES.ADMIN)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Admin access required',
      message: 'Administrator privileges required',
      code: 'ADMIN_PRIVILEGES_REQUIRED',
    });
  }

  next();
};

/**
 * Token generation utility using shared constants
 */
export const generateToken = (user) => {
  const payload = {
    sub: user.id,
    email: user.email,
    roles: user.roles || [USER_ROLES.USER],
    permissions: user.permissions || [],
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, jwtOptions.secretOrKey, {
    expiresIn: envLoader.get(
      'JWT_EXPIRES_IN',
      AUTH_CONSTANTS.JWT_DEFAULTS.EXPIRES_IN
    ),
    issuer: jwtOptions.issuer,
    audience: jwtOptions.audience,
  });
};

/**
 * Token verification utility
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtOptions.secretOrKey, {
      issuer: jwtOptions.issuer,
      audience: jwtOptions.audience,
    });
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

/**
 * Refresh token generation
 */
export const generateRefreshToken = (user) => {
  const payload = {
    sub: user.id,
    type: AUTH_CONSTANTS.TOKEN_TYPES.REFRESH,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, jwtOptions.secretOrKey, {
    expiresIn: envLoader.get(
      'JWT_REFRESH_EXPIRES_IN',
      AUTH_CONSTANTS.JWT_DEFAULTS.REFRESH_EXPIRES_IN
    ),
    issuer: jwtOptions.issuer,
    audience: jwtOptions.audience,
  });
};

/**
 * User context headers for downstream services
 */
export const addUserHeaders = (req, proxyReq, res) => {
  if (req.user) {
    proxyReq.setHeader(AUTH_CONSTANTS.HEADER_NAMES.USER_ID, req.user.id);
    proxyReq.setHeader(AUTH_CONSTANTS.HEADER_NAMES.USER_EMAIL, req.user.email);
    proxyReq.setHeader(
      AUTH_CONSTANTS.HEADER_NAMES.USER_ROLES,
      JSON.stringify(req.user.roles)
    );
  }
};

export default {
  authenticate,
  authorize,
  authMiddleware,
  publicRoute,
  adminOnly,
  generateToken,
  verifyToken,
  generateRefreshToken,
  addUserHeaders,
};
