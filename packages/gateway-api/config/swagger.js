/**
 * Swagger/OpenAPI Configuration for API Gateway
 * Comprehensive documentation and testing interface setup
 */

import { tags, bearerAuth } from '../src/schemas/index.js';

export const swaggerOptions = {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Fastify API Gateway',
      description: `
# API Gateway Documentation

This is a high-performance API Gateway built with Fastify that provides:
- **Authentication & Authorization** - JWT-based security
- **Service Proxying** - Routes requests to microservices
- **Rate Limiting** - Built-in request limiting
- **Admin Management** - User and role management

## Authentication

Most endpoints require authentication via JWT Bearer token. Use the \`/auth/login\` endpoint to obtain a token.

### Getting Started

1. Register a new user with \`POST /auth/register\`
2. Login with \`POST /auth/login\` to get your JWT token
3. Use the token in the Authorization header: \`Bearer <your-token>\`
4. Access protected endpoints and services

### Admin Access

Admin endpoints require a user with 'admin' role. Contact your system administrator to get admin privileges.

## Service Proxying

The gateway proxies requests to the following microservices:
- **Comments Service** - \`/api/comments/*\`
- **Users Service** - \`/api/users/*\`
- **Sahab Service** - \`/api/sahab/*\`

All proxied requests include user context headers for downstream services.
      `,
      version: '2.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    tags,
    components: {
      securitySchemes: {
        bearerAuth
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Invalid or expired token' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Admin access required' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Validation failed' },
                  details: { type: 'object' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Resource not found' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        ConflictError: {
          description: 'Resource already exists',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'User with this email already exists' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Rate limit exceeded' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Internal server error' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  hideUntagged: false,
  exposeRoute: true
};

export const swaggerUiOptions = {
  routePrefix: '/docs',
  exposeRoute: true,
  staticCSP: true,
  transformStaticCSP: (header) => header,
  uiConfig: {
    docExpansion: 'list', // 'list', 'full', 'none'
    deepLinking: true,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    displayOperationId: false,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Add custom request interceptor if needed
      return req;
    },
    responseInterceptor: (res) => {
      // Add custom response interceptor if needed
      return res;
    }
  },
  uiHooks: {
    onRequest: function (request, reply, next) {
      // Add custom hooks if needed
      next();
    },
    preHandler: function (request, reply, next) {
      // Add custom pre-handlers if needed
      next();
    }
  },
  theme: {
    title: 'API Gateway Documentation'
  }
};