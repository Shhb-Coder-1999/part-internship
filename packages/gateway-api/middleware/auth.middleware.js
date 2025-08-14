import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import {
  authConfig,
  isProtectedRoute,
  getRequiredRoles,
} from '../config/auth.config.js';

// Configure JWT Strategy for Passport
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: authConfig.jwt.secret,
  issuer: authConfig.jwt.issuer,
  audience: authConfig.jwt.audience,
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // In a real app, you'd fetch user from database
      // For now, we'll use the payload data
      const user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles || ['user'],
        permissions: payload.permissions || [],
      };

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Authentication Middleware
export const authenticate = (req, res, next) => {
  const path = req.path;
  const method = req.method;

  // Check if route requires protection
  if (!isProtectedRoute(path, method)) {
    return next();
  }

  // Use passport JWT authentication
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Internal server error during authentication',
      });
    }

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Valid authentication token required',
        path: path,
      });
    }

    // Attach user to request
    req.user = user;
    next();
  })(req, res, next);
};

// Authorization Middleware
export const authorize = (requiredRoles = []) => {
  return (req, res, next) => {
    const path = req.path;
    const method = req.method;

    // Get required roles for this route if not explicitly provided
    const roles =
      requiredRoles.length > 0 ? requiredRoles : getRequiredRoles(path, method);

    // If no roles required, allow access
    if (!roles || roles.length === 0) {
      return next();
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Authentication required for this resource',
      });
    }

    // Check if user has required roles
    const userRoles = req.user.roles || [];
    const hasRequiredRole =
      roles.some((role) => userRoles.includes(role)) ||
      userRoles.includes('admin');

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${roles.join(', ')}`,
        userRoles: userRoles,
        requiredRoles: roles,
      });
    }

    next();
  };
};

// Combined Auth Middleware
export const authMiddleware = (req, res, next) => {
  const path = req.path;
  const method = req.method;

  // Skip auth for public routes
  if (!isProtectedRoute(path, method)) {
    return next();
  }

  // Apply authentication
  authenticate(req, res, (err) => {
    if (err) return next(err);

    // Apply authorization
    const requiredRoles = getRequiredRoles(path, method);
    authorize(requiredRoles)(req, res, next);
  });
};

// Token Generation Utility
export const generateToken = (user) => {
  const payload = {
    sub: user.id,
    email: user.email,
    roles: user.roles || ['user'],
    permissions: user.permissions || [],
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.expiresIn,
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience,
  });
};

// Token Verification Utility
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, authConfig.jwt.secret, {
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

// Refresh Token Generation
export const generateRefreshToken = (user) => {
  const payload = {
    sub: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.refreshTokenExpiresIn,
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience,
  });
};

export default {
  authenticate,
  authorize,
  authMiddleware,
  generateToken,
  verifyToken,
  generateRefreshToken,
};
