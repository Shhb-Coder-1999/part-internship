import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  changePassword,
} from './auth.controller.js';

/**
 * Fastify Auth Routes Plugin
 * Handles authentication endpoints with JSON Schema validation
 */
async function authRoutes(fastify, options) {
  // Rate limiting options for auth endpoints
  const authRateLimit = {
    max: 5,
    timeWindow: '15 minutes',
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many authentication attempts, retry in ${Math.round(context.ttl / 1000)} seconds`,
      statusCode: 429,
      timestamp: new Date().toISOString(),
    }),
  };

  // JSON Schema definitions
  const registerSchema = {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Valid email address',
        },
        password: {
          type: 'string',
          minLength: 8,
          pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
          description:
            'Password must be at least 8 characters with lowercase, uppercase, and number',
        },
        firstName: {
          type: 'string',
          minLength: 1,
          maxLength: 50,
          description: 'First name (optional)',
        },
        lastName: {
          type: 'string',
          minLength: 1,
          maxLength: 50,
          description: 'Last name (optional)',
        },
        role: {
          type: 'string',
          enum: ['user', 'admin', 'student', 'teacher', 'intern', 'supervisor'],
          description: 'User role (optional)',
        },
      },
      additionalProperties: false,
    },
  };

  const loginSchema = {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Valid email address',
        },
        password: {
          type: 'string',
          minLength: 1,
          description: 'Password',
        },
      },
      additionalProperties: false,
    },
  };

  const refreshTokenSchema = {
    body: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: {
          type: 'string',
          minLength: 1,
          description: 'Valid refresh token',
        },
      },
      additionalProperties: false,
    },
  };

  const changePasswordSchema = {
    body: {
      type: 'object',
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: {
          type: 'string',
          minLength: 1,
          description: 'Current password',
        },
        newPassword: {
          type: 'string',
          minLength: 8,
          pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
          description:
            'New password must be at least 8 characters with lowercase, uppercase, and number',
        },
      },
      additionalProperties: false,
    },
  };

  // Standard response schemas
  const successResponse = {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [true] },
      message: { type: 'string' },
      data: { type: 'object' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  };

  const errorResponse = {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      error: { type: 'string' },
      message: { type: 'string' },
      statusCode: { type: 'integer' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  };

  // Routes

  // User Registration
  fastify.post(
    '/register',
    {
      config: {
        rateLimit: authRateLimit,
      },
      schema: {
        description: 'Register a new user account',
        tags: ['Authentication'],
        ...registerSchema,
        response: {
          201: successResponse,
          400: errorResponse,
          409: errorResponse,
        },
      },
    },
    register
  );

  // User Login
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: authRateLimit,
      },
      schema: {
        description: 'Authenticate user and return tokens',
        tags: ['Authentication'],
        ...loginSchema,
        response: {
          200: successResponse,
          401: errorResponse,
          400: errorResponse,
        },
      },
    },
    login
  );

  // Refresh Token
  fastify.post(
    '/refresh',
    {
      config: {
        rateLimit: authRateLimit,
      },
      schema: {
        description: 'Refresh access token using refresh token',
        tags: ['Authentication'],
        ...refreshTokenSchema,
        response: {
          200: successResponse,
          401: errorResponse,
          400: errorResponse,
        },
      },
    },
    refreshToken
  );

  // Logout
  fastify.post(
    '/logout',
    {
      schema: {
        description: 'Logout user and invalidate tokens',
        tags: ['Authentication'],
        response: {
          200: successResponse,
        },
      },
    },
    logout
  );

  // Get User Profile (requires authentication)
  fastify.get(
    '/profile',
    {
      preHandler: fastify.authenticate,
      schema: {
        description: 'Get authenticated user profile',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        response: {
          200: successResponse,
          401: errorResponse,
        },
      },
    },
    getProfile
  );

  // Change Password (requires authentication)
  fastify.put(
    '/change-password',
    {
      preHandler: fastify.authenticate,
      schema: {
        description: 'Change user password',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        ...changePasswordSchema,
        response: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    changePassword
  );

  // Auth Status (requires authentication)
  fastify.get(
    '/status',
    {
      preHandler: fastify.authenticate,
      schema: {
        description: 'Check authentication status',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              authenticated: { type: 'boolean', enum: [true] },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  roles: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    async (request, reply) => {
      return {
        authenticated: true,
        user: {
          id: request.user.id,
          email: request.user.email,
          roles: request.user.roles,
        },
      };
    }
  );

  // Auth Info Endpoint
  fastify.get(
    '/info',
    {
      schema: {
        description: 'Get authentication service information',
        tags: ['Authentication'],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              endpoints: { type: 'object' },
              roles: { type: 'object' },
              demoUsers: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return {
        message: 'Authentication service information',
        endpoints: {
          register: 'POST /auth/register',
          login: 'POST /auth/login',
          refresh: 'POST /auth/refresh',
          logout: 'POST /auth/logout',
          profile: 'GET /auth/profile (requires auth)',
          changePassword: 'PUT /auth/change-password (requires auth)',
          status: 'GET /auth/status (requires auth)',
        },
        roles: {
          user: 'Regular user access',
          admin: 'Administrative access',
          student: 'College student access',
          teacher: 'College teacher access',
          intern: 'Internship participant access',
          supervisor: 'Internship supervisor access',
        },
        demoUsers: {
          admin: {
            email: 'admin@example.com',
            password: 'admin123',
            roles: ['admin'],
          },
          user: {
            email: 'user@example.com',
            password: 'user123',
            roles: ['user'],
          },
        },
      };
    }
  );
}

export default authRoutes;
