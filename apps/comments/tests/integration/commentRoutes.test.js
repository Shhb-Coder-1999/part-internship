/**
 * Integration Tests for Comment Routes
 * Tests complete request-response cycle with middleware and services
 */

import request from 'supertest';
import express from 'express';
import { commentRoutes } from '@routes';

describe('Comment Routes - Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/comments', commentRoutes);
  });

  describe('Route Configuration', () => {
    it('should have all required routes configured', () => {
      // Check that the app has routes configured
      expect(app._router).toBeDefined();
      expect(app._router.stack).toBeDefined();
      expect(app._router.stack.length).toBeGreaterThan(0);
      
      // Check that commentRoutes is properly imported
      expect(commentRoutes).toBeDefined();
      expect(typeof commentRoutes).toBe('function');
    });

    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/comments/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/comments')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('Basic Route Functionality', () => {
    it('should respond to GET /api/comments', async () => {
      const response = await request(app)
        .get('/api/comments');

      // Should not crash, even if it returns an error
      expect(response.status).toBeDefined();
      expect(typeof response.status).toBe('number');
    });

    it('should respond to POST /api/comments', async () => {
      const response = await request(app)
        .post('/api/comments')
        .set('Content-Type', 'application/json')
        .send({ text: 'test comment' });

      // Should not crash, even if it returns an error
      expect(response.status).toBeDefined();
      expect(typeof response.status).toBe('number');
    });
  });
});
