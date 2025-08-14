// Authentication and Authorization Configuration
export const authConfig = {
  // JWT Settings
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'part-internship-gateway',
    audience: process.env.JWT_AUDIENCE || 'part-internship-services',
  },

  // Password Settings
  password: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    requireSpecialChar: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
    requireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    authWindowMs:
      parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
  },

  // Service Protection Configuration
  // Configure which services require authentication/authorization
  serviceProtection: {
    // Recruitment Services
    '/part/recruitment/comments': {
      enabled: process.env.PROTECT_COMMENTS_SERVICE !== 'false',
      requireAuth: true,
      requireRoles: ['user', 'admin'], // Allow both users and admins
      methods: {
        GET: { requireAuth: false }, // Public read access
        POST: { requireAuth: true, requireRoles: ['user', 'admin'] },
        PUT: { requireAuth: true, requireRoles: ['user', 'admin'] },
        DELETE: { requireAuth: true, requireRoles: ['admin'] }, // Only admins can delete
      },
    },

    '/part/recruitment/users': {
      enabled: process.env.PROTECT_USERS_SERVICE !== 'false',
      requireAuth: true,
      requireRoles: ['admin'], // Only admins can access user management
      methods: {
        GET: { requireAuth: true, requireRoles: ['admin'] },
        POST: { requireAuth: true, requireRoles: ['admin'] },
        PUT: { requireAuth: true, requireRoles: ['admin'] },
        DELETE: { requireAuth: true, requireRoles: ['admin'] },
      },
    },

    '/part/recruitment/sahab': {
      enabled: process.env.PROTECT_SAHAB_SERVICE !== 'false',
      requireAuth: false, // Public service by default
      requireRoles: [],
      methods: {
        GET: { requireAuth: false },
        POST: { requireAuth: true, requireRoles: ['user', 'admin'] },
        PUT: { requireAuth: true, requireRoles: ['admin'] },
        DELETE: { requireAuth: true, requireRoles: ['admin'] },
      },
    },

    // College Services (Future)
    '/part/college': {
      enabled: process.env.PROTECT_COLLEGE_SERVICES !== 'false',
      requireAuth: true,
      requireRoles: ['student', 'teacher', 'admin'],
      methods: {
        GET: {
          requireAuth: true,
          requireRoles: ['student', 'teacher', 'admin'],
        },
        POST: { requireAuth: true, requireRoles: ['teacher', 'admin'] },
        PUT: { requireAuth: true, requireRoles: ['teacher', 'admin'] },
        DELETE: { requireAuth: true, requireRoles: ['admin'] },
      },
    },

    // Internship Services (Future)
    '/part/internship': {
      enabled: process.env.PROTECT_INTERNSHIP_SERVICES !== 'false',
      requireAuth: true,
      requireRoles: ['intern', 'supervisor', 'admin'],
      methods: {
        GET: {
          requireAuth: true,
          requireRoles: ['intern', 'supervisor', 'admin'],
        },
        POST: { requireAuth: true, requireRoles: ['supervisor', 'admin'] },
        PUT: { requireAuth: true, requireRoles: ['supervisor', 'admin'] },
        DELETE: { requireAuth: true, requireRoles: ['admin'] },
      },
    },
  },

  // Public Routes (no auth required)
  publicRoutes: [
    '/health',
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/',
  ],

  // Admin Routes (require admin role)
  adminRoutes: ['/admin', '/metrics', '/logs'],

  // User Roles and Permissions
  roles: {
    admin: {
      permissions: ['*'], // All permissions
      description: 'Full system access',
    },
    user: {
      permissions: [
        'read:comments',
        'write:comments',
        'read:profile',
        'write:profile',
      ],
      description: 'Regular user access',
    },
    student: {
      permissions: [
        'read:courses',
        'write:assignments',
        'read:profile',
        'write:profile',
      ],
      description: 'College student access',
    },
    teacher: {
      permissions: [
        'read:courses',
        'write:courses',
        'read:students',
        'grade:assignments',
      ],
      description: 'College teacher access',
    },
    intern: {
      permissions: [
        'read:projects',
        'write:reports',
        'read:profile',
        'write:profile',
      ],
      description: 'Internship participant access',
    },
    supervisor: {
      permissions: [
        'read:projects',
        'write:projects',
        'read:interns',
        'write:evaluations',
      ],
      description: 'Internship supervisor access',
    },
  },
};

// Helper function to check if a route requires protection
export function isProtectedRoute(path, method = 'GET') {
  // Check if it's a public route
  if (authConfig.publicRoutes.some((route) => path.startsWith(route))) {
    return false;
  }

  // Check service protection configuration
  for (const [servicePath, config] of Object.entries(
    authConfig.serviceProtection
  )) {
    if (path.startsWith(servicePath)) {
      if (!config.enabled) return false;

      // Check method-specific protection
      if (config.methods && config.methods[method]) {
        return config.methods[method].requireAuth || false;
      }

      return config.requireAuth || false;
    }
  }

  // Default to protected for unknown routes
  return true;
}

// Helper function to get required roles for a route
export function getRequiredRoles(path, method = 'GET') {
  // Check admin routes
  if (authConfig.adminRoutes.some((route) => path.startsWith(route))) {
    return ['admin'];
  }

  // Check service protection configuration
  for (const [servicePath, config] of Object.entries(
    authConfig.serviceProtection
  )) {
    if (path.startsWith(servicePath)) {
      // Check method-specific roles
      if (config.methods && config.methods[method]) {
        return config.methods[method].requireRoles || [];
      }

      return config.requireRoles || [];
    }
  }

  return [];
}

export default authConfig;
