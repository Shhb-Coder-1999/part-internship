import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Comments API',
      version: '1.0.0',
      description: 'A comprehensive API for managing comments with CRUD operations, nested replies, likes/dislikes, and soft deletion.',
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
        description: 'Local development server'
      },
      {
        url: 'http://172.30.230.15:3000',
        description: 'Network development server'
      }
    ],
    tags: [
      {
        name: 'Comments',
        description: 'Comment management operations'
      },
      {
        name: 'System',
        description: 'System health and information endpoints'
      }
    ],
    components: {
      schemas: {
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'comment_123' },
            text: { type: 'string', example: 'This is a comment' },
            authorId: { type: 'string', example: 'user_456' },
            parentId: { type: 'string', nullable: true, example: 'comment_789' },
            likes: { type: 'integer', example: 5 },
            dislikes: { type: 'integer', example: 1 },
            isDeleted: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CommentCreate: {
          type: 'object',
          required: ['text', 'authorId'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 1000 },
            authorId: { type: 'string' },
            parentId: { type: 'string', nullable: true }
          }
        },
        CommentUpdate: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 1000 }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string', example: 'Server is running' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        ApiInfoResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Comments API Server' },
            version: { type: 'string', example: '1.0.0' },
            endpoints: { type: 'object' }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',
    './server.js'
  ]
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
