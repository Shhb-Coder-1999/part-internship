import express from 'express';
import cors from 'cors';
import commentsRouter from '@routes/comments';
import { setupErrorHandling } from '@shared/middleware';
import { createAppLogger } from '@shared/utils';
import { ENV_VARS, DEFAULTS, LOG_CONTEXTS } from '@constants';

import { generateHybrid, setupSwaggerUI, swaggerUi } from './tools/swagger/index.js';

const app = express();
const PORT = process.env[ENV_VARS.PORT] || DEFAULTS.PORT;
const HOST = process.env[ENV_VARS.HOST] || DEFAULTS.HOST;
const logger = createAppLogger('CommentsServer');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/api/comments', commentsRouter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health Check
 *     description: Check if the server is running and healthy
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "success"
 *               message: "Server is running"
 *               timestamp: "2023-12-20T10:30:00Z"
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Comments API Server is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Information
 *     description: Get API information and available endpoints
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiInfoResponse'
 *             example:
 *               message: "Comments API Server"
 *               version: "1.0.0"
 *               documentation: "/api-docs"
 *               endpoints: {
 *                 health: "GET /health",
 *                 comments: {
 *                   getAll: "GET /api/comments",
 *                   create: "POST /api/comments",
 *                   update: "PATCH /api/comments/:id",
 *                   delete: "DELETE /api/comments/:id",
 *                   like: "POST /api/comments/:id/like",
 *                   dislike: "POST /api/comments/:id/dislike"
 *                 }
 *               }
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Comments API Server',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: 'GET /health',
      comments: {
        getAll: 'GET /api/comments',
        create: 'POST /api/comments',
        update: 'PATCH /api/comments/:id',
        delete: 'DELETE /api/comments/:id',
        like: 'POST /api/comments/:id/like',
        dislike: 'POST /api/comments/:id/dislike'
      }
    }
  });
});

// Setup error handling (this replaces the manual 404 and error handlers)
setupErrorHandling(app, {
  handleValidation: true,
  handleDatabase: true,
  handleRateLimit: true
});

// Swagger Documentation - will be set up after generation
let swaggerSpecs = null;

// Generate Swagger documentation and start server
generateHybrid().then((result) => {
  if (result.success) {
    // Set up Swagger UI
    if (result.specs) {
      // JSDoc generation succeeded
      swaggerSpecs = result.specs;
      app.use('/api-docs', swaggerUi.serve, setupSwaggerUI(swaggerSpecs));
    } else {
      // Auto generation succeeded, use the generated file
      app.use('/api-docs', swaggerUi.serve, setupSwaggerUI('./docs/swagger-output.json'));
    }
    
    // Start server
    app.listen(PORT, HOST, () => {
      logger.info(`🚀 Comments API Server started`, {
        port: PORT,
        host: HOST,
        localUrl: `http://localhost:${PORT}`,
        networkUrl: `http://172.30.230.15:${PORT}`
      });
      
      console.log(`🚀 Comments API Server is running on http://localhost:${PORT}`);
      console.log(`🌐 Network access: http://172.30.230.15:${PORT}`);
      console.log(`📝 Comments API available at http://172.30.230.15:${PORT}/api/comments`);
      console.log(`🏥 Health check at http://172.30.230.15:${PORT}/health`);
      console.log(`📚 API Documentation at http://172.30.230.15:${PORT}/api-docs`);
    });
  } else {
    console.error('❌ Failed to generate Swagger documentation:', result.error);
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Error during server startup:', error);
  process.exit(1);
}); 