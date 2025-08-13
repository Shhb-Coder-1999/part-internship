export const TOOL_CONFIG = {
  // Output directories
  output: {
    docs: './docs',
    swagger: './docs/swagger-output.json',
    postman: './docs/comments-api.postman_collection.json'
  },
  
  // Source files to scan
  sources: {
    routes: './src/routes/*.js',
    server: './server.js',
    controllers: './src/controllers/*.js'
  },
  
  // Swagger configuration
  swagger: {
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
  
  // Server configurations
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
  
  // API tags
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
  
  // Postman collection settings
  postman: {
    baseUrl: 'localhost',
    port: '3000',
    environment: 'development'
  }
};
