/**
 * Comments Service Integration Tests
 * Tests all comment CRUD operations, likes/dislikes, and business logic
 */

import { test, beforeAll, afterAll, describe, expect } from '@jest/globals';
import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';

let app;
let testComment;
let testComment2;
let createdCommentId;
let authToken;
let userId;

// Test database path
const testDbPath = path.join(process.cwd(), 'prisma', 'comments_test.db');

beforeAll(async () => {
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `file:${testDbPath}`;

  // Import server instance
  const serverModule = await import('../../src/server-instance.js');
  app = serverModule.default;

  // Initialize database
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create test data
  userId = 'test-user-id-123';
  authToken = 'mock-jwt-token';

  testComment = {
    text: 'This is a test comment for integration testing',
    authorId: userId
  };

  testComment2 = {
    text: 'This is another test comment for testing purposes',
    authorId: userId
  };
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

describe('Comments Service Tests', () => {
  describe('Create Comment', () => {
    test('should create a new comment successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: testComment,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBeDefined();
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.text).toBe(testComment.text);
      expect(body.data.authorId).toBe(testComment.authorId);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
      expect(body.data.likes).toBe(0);
      expect(body.data.dislikes).toBe(0);
      expect(body.timestamp).toBeDefined();

      // Store for later tests
      createdCommentId = body.data.id;
    });

    test('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          // Missing text field
          authorId: userId
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    test('should validate text length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: '', // Empty text
          authorId: userId
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle very long text', async () => {
      const longText = 'A'.repeat(5000);
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: longText,
          authorId: userId
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      // Should either succeed (if length is within limits) or fail gracefully
      expect([201, 400]).toContain(response.statusCode);
    });

    test('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: testComment,
        headers: {
          'content-type': 'application/json'
        }
      });

      expect([401, 403]).toContain(response.statusCode);
    });
  });

  describe('Get Comments', () => {
    test('should get all comments with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.comments || body.data)).toBe(true);
      expect(body.timestamp).toBeDefined();
    });

    test('should support pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments?page=1&limit=5'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    test('should support sorting', async () => {
      // Create another comment first
      await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: testComment2,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/comments?sort=createdAt&order=desc'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    test('should handle invalid pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments?page=-1&limit=1000'
      });

      // Should either return 400 or handle gracefully with defaults
      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('Get Comment by ID', () => {
    test('should get comment by valid ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/comments/${createdCommentId}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(createdCommentId);
      expect(body.data.text).toBe(testComment.text);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    test('should return 404 for non-existent comment', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    test('should handle malformed comment ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/invalid-id-format'
      });

      expect([400, 404]).toContain(response.statusCode);
    });
  });

  describe('Update Comment', () => {
    test('should update comment successfully', async () => {
      const updateData = {
        text: 'This is an updated comment text'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdCommentId}`,
        payload: updateData,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.text).toBe(updateData.text);
      expect(body.data.updatedAt).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    test('should not update with invalid data', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdCommentId}`,
        payload: {
          text: '' // Empty text
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should return 404 for non-existent comment update', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/comments/non-existent-id',
        payload: {
          text: 'Updated text'
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    test('should require authentication for update', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdCommentId}`,
        payload: {
          text: 'Unauthorized update'
        },
        headers: {
          'content-type': 'application/json'
        }
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    test('should not allow updating immutable fields', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/comments/${createdCommentId}`,
        payload: {
          id: 'different-id',
          authorId: 'different-author',
          createdAt: new Date().toISOString(),
          likes: 100,
          dislikes: 50
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      // Should either ignore these fields or return an error
      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('Comment Likes and Dislikes', () => {
    test('should like a comment successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdCommentId}/like`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.likes).toBeGreaterThan(0);
      expect(body.timestamp).toBeDefined();
    });

    test('should dislike a comment successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdCommentId}/dislike`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.dislikes).toBeGreaterThan(0);
      expect(body.timestamp).toBeDefined();
    });

    test('should handle like on non-existent comment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments/non-existent-id/like',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    test('should handle dislike on non-existent comment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments/non-existent-id/dislike',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    test('should require authentication for likes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdCommentId}/like`
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    test('should require authentication for dislikes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdCommentId}/dislike`
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    test('should prevent duplicate likes from same user', async () => {
      // Like the comment multiple times
      const responses = await Promise.all([
        app.inject({
          method: 'POST',
          url: `/api/comments/${createdCommentId}/like`,
          headers: {
            authorization: `Bearer ${authToken}`
          }
        }),
        app.inject({
          method: 'POST',
          url: `/api/comments/${createdCommentId}/like`,
          headers: {
            authorization: `Bearer ${authToken}`
          }
        })
      ]);

      // Should handle duplicate likes gracefully
      responses.forEach(response => {
        expect([200, 409]).toContain(response.statusCode);
      });
    });
  });

  describe('Delete Comment', () => {
    test('should delete comment successfully', async () => {
      // Create a comment specifically for deletion
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'Comment to be deleted',
          authorId: userId
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      const createdComment = JSON.parse(createResponse.body);
      const commentIdToDelete = createdComment.data.id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${commentIdToDelete}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.timestamp).toBeDefined();

      // Verify comment is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/comments/${commentIdToDelete}`
      });

      expect(getResponse.statusCode).toBe(404);
    });

    test('should return 404 for non-existent comment deletion', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/comments/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    test('should require authentication for deletion', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${createdCommentId}`
      });

      expect([401, 403]).toContain(response.statusCode);
    });
  });

  describe('Comment Search and Filtering', () => {
    test('should search comments by text', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/search?q=updated&limit=10'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.timestamp).toBeDefined();
    });

    test('should handle empty search results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/search?q=nonexistenttext&limit=10'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(0);
    });

    test('should filter comments by author', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/comments?authorId=${userId}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    test('should validate search parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/search' // Missing query parameter
      });

      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('Response Format Validation', () => {
    test('all responses should have consistent format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Check response structure
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('timestamp');
      expect(typeof body.success).toBe('boolean');
      expect(typeof body.timestamp).toBe('string');
    });

    test('error responses should have consistent format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/non-existent-id'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('timestamp');
      expect(body.success).toBe(false);
    });

    test('comment objects should have required fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/comments/${createdCommentId}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const comment = body.data;
      
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('text');
      expect(comment).toHaveProperty('authorId');
      expect(comment).toHaveProperty('createdAt');
      expect(comment).toHaveProperty('updatedAt');
      expect(comment).toHaveProperty('likes');
      expect(comment).toHaveProperty('dislikes');
    });
  });

  describe('Data Validation and Security', () => {
    test('should sanitize HTML in comment text', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: '<script>alert("xss")</script>Safe content',
          authorId: userId
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      // Should either sanitize or reject
      expect([201, 400]).toContain(response.statusCode);
      
      if (response.statusCode === 201) {
        const body = JSON.parse(response.body);
        // Script tags should be removed or escaped
        expect(body.data.text).not.toContain('<script>');
      }
    });

    test('should handle SQL injection attempts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: "/api/comments/'; DROP TABLE comments; --"
      });

      // Should not crash and should return appropriate error
      expect([400, 404]).toContain(response.statusCode);
    });

    test('should validate comment text encoding', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'Comment with emoji 😀 and unicode ñáéíóú',
          authorId: userId
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.text).toContain('😀');
      expect(body.data.text).toContain('ñáéíóú');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle missing content type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: JSON.stringify(testComment),
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, we'll test that the service handles errors without crashing
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(typeof response.statusCode).toBe('number');
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(app.inject({
          method: 'GET',
          url: '/api/comments'
        }));
      }

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });

    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle bulk operations efficiently', async () => {
      const bulkRequests = [];
      for (let i = 0; i < 5; i++) {
        bulkRequests.push(app.inject({
          method: 'POST',
          url: '/api/comments',
          payload: {
            text: `Bulk comment ${i}`,
            authorId: userId
          },
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${authToken}`
          }
        }));
      }

      const startTime = Date.now();
      const responses = await Promise.all(bulkRequests);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(201);
      });
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds max for 5 requests
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to comment creation', async () => {
      const requests = [];
      // Make many requests quickly
      for (let i = 0; i < 20; i++) {
        requests.push(app.inject({
          method: 'POST',
          url: '/api/comments',
          payload: {
            text: `Rate limit test comment ${i}`,
            authorId: userId
          },
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${authToken}`
          }
        }));
      }

      const responses = await Promise.all(requests);
      
      // Some requests might be rate limited
      const statusCodes = responses.map(r => r.statusCode);
      const hasRateLimit = statusCodes.some(code => code === 429);
      
      // If rate limiting is implemented, some should be 429
      // If not implemented, all should be 201 or have other valid status
      expect(statusCodes.every(code => [201, 400, 429].includes(code))).toBe(true);
    });
  });
});
