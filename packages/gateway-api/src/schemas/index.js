/**
 * OpenAPI Schemas for API Gateway
 * Comprehensive schema definitions for all API endpoints
 */

// Common response schemas
export const successResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: { type: 'object' },
    meta: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string' },
        version: { type: 'string' }
      }
    }
  }
};

export const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: { type: 'string' },
    details: { type: 'object' },
    timestamp: { type: 'string', format: 'date-time' }
  }
};

// User schemas
export const userBase = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'User unique identifier' },
    email: { type: 'string', format: 'email', description: 'User email address' },
    firstName: { type: 'string', description: 'User first name' },
    lastName: { type: 'string', description: 'User last name' },
    isActive: { type: 'boolean', description: 'Whether user account is active' },
    isVerified: { type: 'boolean', description: 'Whether user email is verified' },
    roles: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'User roles'
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const userRegistration = {
  type: 'object',
  required: ['email', 'password', 'firstName', 'lastName'],
  properties: {
    email: { 
      type: 'string', 
      format: 'email',
      description: 'User email address'
    },
    password: { 
      type: 'string', 
      minLength: 6,
      description: 'User password (minimum 6 characters)'
    },
    firstName: { 
      type: 'string', 
      minLength: 1,
      description: 'User first name'
    },
    lastName: { 
      type: 'string', 
      minLength: 1,
      description: 'User last name'
    }
  },
  examples: [{
    email: 'user@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe'
  }]
};

export const userLogin = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { 
      type: 'string', 
      format: 'email',
      description: 'User email address'
    },
    password: { 
      type: 'string',
      description: 'User password'
    }
  },
  examples: [{
    email: 'user@example.com',
    password: 'password123'
  }]
};

export const adminUserCreation = {
  type: 'object',
  required: ['email', 'password', 'firstName', 'lastName'],
  properties: {
    email: { 
      type: 'string', 
      format: 'email',
      description: 'User email address'
    },
    password: { 
      type: 'string', 
      minLength: 6,
      description: 'User password (minimum 6 characters)'
    },
    firstName: { 
      type: 'string', 
      minLength: 1,
      description: 'User first name'
    },
    lastName: { 
      type: 'string', 
      minLength: 1,
      description: 'User last name'
    },
    isActive: { 
      type: 'boolean',
      description: 'Whether user account is active'
    },
    isVerified: { 
      type: 'boolean',
      description: 'Whether user email is verified'
    },
    roles: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'User roles'
    }
  },
  examples: [{
    email: 'admin@example.com',
    password: 'adminpassword123',
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    isVerified: true,
    roles: ['admin', 'user']
  }]
};

// Authentication response schemas
export const authSuccessResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    token: { 
      type: 'string',
      description: 'JWT access token'
    },
    data: userBase,
    meta: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string' },
        version: { type: 'string' }
      }
    }
  }
};

export const userCreationResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: userBase,
    meta: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string' },
        version: { type: 'string' }
      }
    }
  }
};

// Health check schema
export const healthResponse = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    service: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    uptime: { type: 'number', description: 'Server uptime in seconds' },
    environment: { type: 'string' },
    version: { type: 'string' },
    services: {
      type: 'object',
      properties: {
        database: { type: 'string' },
        comments: { type: 'string' },
        users: { type: 'string' },
        sahab: { type: 'string' }
      }
    }
  }
};

// Gateway info schema
export const gatewayInfoResponse = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'Welcome to the Fastify API Gateway' },
    version: { type: 'string', example: '2.0.0' },
    environment: { type: 'string', example: 'development' },
    timestamp: { type: 'string', format: 'date-time' },
    authentication: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
        type: { type: 'string', example: 'JWT' }
      }
    },
    services: {
      type: 'object',
      properties: {
        comments: { type: 'string', example: 'http://localhost:3001/api/comments' },
        users: { type: 'string', example: 'http://localhost:3002/api/users' },
        sahab: { type: 'string', example: 'http://localhost:3003/api/sahab' }
      }
    }
  }
};

// Pagination schema
export const paginationResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    users: {
      type: 'array',
      items: userBase
    },
    pagination: {
      type: 'object',
      properties: {
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        total: { type: 'number', example: 100 },
        pages: { type: 'number', example: 5 }
      }
    },
    meta: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string', example: 'gateway-auth' },
        version: { type: 'string', example: '2.0.0' }
      }
    }
  }
};

// Query parameters
export const userListQuery = {
  type: 'object',
  properties: {
    page: { 
      type: 'integer', 
      minimum: 1, 
      default: 1,
      description: 'Page number for pagination'
    },
    limit: { 
      type: 'integer', 
      minimum: 1, 
      maximum: 100, 
      default: 20,
      description: 'Number of items per page'
    },
    sortBy: { 
      type: 'string', 
      enum: ['createdAt', 'updatedAt', 'email', 'firstName', 'lastName'],
      default: 'createdAt',
      description: 'Field to sort by'
    },
    order: { 
      type: 'string', 
      enum: ['asc', 'desc'],
      default: 'desc',
      description: 'Sort order'
    }
  }
};

// Security schemas
export const bearerAuth = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT'
};

// Tags for organizing endpoints
export const tags = [
  {
    name: 'Gateway',
    description: 'Gateway information and health checks'
  },
  {
    name: 'Authentication',
    description: 'User authentication and authorization'
  },
  {
    name: 'Admin',
    description: 'Administrative endpoints (requires admin role)'
  },
  {
    name: 'Proxy',
    description: 'Service proxy endpoints'
  }
];