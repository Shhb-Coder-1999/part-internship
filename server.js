import express from 'express';
import cors from 'cors';
import commentsRouter from './routes/comments.js';

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Allow connections from any IP

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/comments', commentsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Comments API Server',
    version: '1.0.0',
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://172.30.230.15:${PORT}`);
  console.log(`📝 Comments API available at http://172.30.230.15:${PORT}/api/comments`);
  console.log(`🏥 Health check at http://172.30.230.15:${PORT}/health`);
}); 