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
  // ALL SERVICES NOW REQUIRE JWT AUTHENTICATION
  serviceProtection: {
    // Recruitment Services
    '/part/recruitment/comments': {
      enabled: true,
      requireAuth: true,
      requireRoles: ['user', 'admin'],
      methods: {
        GET: { requireAuth: true, requireRoles: ['user', 'admin'] }, // ✅ Now requires auth
        POST: { requireAuth: true, requireRoles: ['user', 'admin'] },
        PUT: { requireAuth: true, requireRoles: ['user', 'admin'] },
        DELETE: { requireAuth: true, requireRoles: ['user', 'admin'] }, // Users can delete their own
      },
    },

    '/part/recruitment/users': {
      enabled: true,
      requireAuth: true,
      requireRoles: ['user', 'admin'], // ✅ Users can access their own data
      methods: {
        GET: { requireAuth: true, requireRoles: ['user', 'admin'] }, // Users can view their profile
        POST: { requireAuth: true, requireRoles: ['admin'] }, // Only admins create users
        PUT: { requireAuth: true, requireRoles: ['user', 'admin'] }, // Users can update their profile
        DELETE: { requireAuth: true, requireRoles: ['admin'] }, // Only admins delete users
      },
    },

    '/part/recruitment/sahab': {
      enabled: true,
      requireAuth: true, // ✅ Now requires authentication
      requireRoles: ['user', 'admin'],
      methods: {
        GET: { requireAuth: true, requireRoles: ['user', 'admin'] }, // ✅ Now requires auth
        POST: { requireAuth: true, requireRoles: ['user', 'admin'] },
        PUT: { requireAuth: true, requireRoles: ['user', 'admin'] }, // Users can edit their data
        DELETE: { requireAuth: true, requireRoles: ['user', 'admin'] }, // Users can delete their data
      },
    },

    // College Services (Future)
    '/part/college': {
      enabled: true,
      requireAuth: true,
      requireRoles: ['student', 'teacher', 'admin'],
      methods: {
        GET: { requireAuth: true, requireRoles: ['student', 'teacher', 'admin'] },
        POST: { requireAuth: true, requireRoles: ['student', 'teacher', 'admin'] }, // Students can create
        PUT: { requireAuth: true, requireRoles: ['student', 'teacher', 'admin'] }, // Users edit their data
        DELETE: { requireAuth: true, requireRoles: ['teacher', 'admin'] }, // Teachers/admins delete
      },
    },

    // Internship Services (Future)
    '/part/internship': {
      enabled: true,
      requireAuth: true,
      requireRoles: ['intern', 'supervisor', 'admin'],
      methods: {
        GET: { requireAuth: true, requireRoles: ['intern', 'supervisor', 'admin'] },
        POST: { requireAuth: true, requireRoles: ['intern', 'supervisor', 'admin'] }, // Interns can create
        PUT: { requireAuth: true, requireRoles: ['intern', 'supervisor', 'admin'] }, // Users edit their data
        DELETE: { requireAuth: true, requireRoles: ['supervisor', 'admin'] }, // Supervisors/admins delete
      },
    },

    // Catch-all for any service - REQUIRE AUTH BY DEFAULT
    '/part': {
      enabled: true,
      requireAuth: true,
      requireRoles: ['user', 'admin'],
      methods: {
        GET: { requireAuth: true, requireRoles: ['user', 'admin'] },
        POST: { requireAuth: true, requireRoles: ['user', 'admin'] },
        PUT: { requireAuth: true, requireRoles: ['user', 'admin'] },
        DELETE: { requireAuth: true, requireRoles: ['user', 'admin'] },
      },
    },
  },

  // Public Routes (no auth required) - MINIMAL LIST
  publicRoutes: [
    '/health',
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/info',
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
  // Special case for root route
  if (path === '/') {
    return false;
  }
  
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
