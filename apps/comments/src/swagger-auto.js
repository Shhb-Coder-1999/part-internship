import swaggerAutogen from 'swagger-autogen';
import swaggerUi from 'swagger-ui-express';

// Swagger configuration
const doc = {
  info: {
    title: 'Comments API',
    description: 'A comprehensive API for managing comments with CRUD operations, nested replies, likes/dislikes, and soft deletion.',
    version: '1.0.0',
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
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
};

// Function to generate Swagger documentation
export const generateSwagger = async () => {
  const outputFile = './swagger-output.json';
  const endpointsFiles = [
    './src/routes/*.js',
    './server.js'
  ];

  try {
    await swaggerAutogen(outputFile, endpointsFiles, doc);
    console.log('✅ Swagger documentation generated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error generating Swagger documentation:', error);
    return false;
  }
};

// Function to get Swagger UI setup
export const getSwaggerUI = () => {
  return swaggerUi.serve;
};

// Function to setup Swagger UI with generated specs
export const setupSwaggerUI = (specs) => {
  return swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Comments API Documentation'
  });
};

export { swaggerUi };
