/**
 * Comments Service E2E Tests
 * Complete end-to-end testing of comments service functionality
 */

import { test, beforeAll, afterAll, describe, expect } from '@jest/globals';
import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

let app;
let prisma;
let testComment;
let testComment2;
let createdCommentId;
let userId;
let authToken;

const testDbPath = path.join(process.cwd(), 'prisma', 'comments_e2e_test.db');

beforeAll(async () => {
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `file:${testDbPath}`;
  process.env.JWT_SECRET = 'test-secret-key-comments-e2e';

  // Initialize Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${testDbPath}`
      }
    }
  });

  // Create database tables
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      authorId TEXT NOT NULL,
      parentId TEXT,
      likes INTEGER DEFAULT 0,
      dislikes INTEGER DEFAULT 0,
      isDeleted BOOLEAN DEFAULT false,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS comment_likes (
      id TEXT PRIMARY KEY,
      commentId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (commentId) REFERENCES comments(id) ON DELETE CASCADE,
      UNIQUE(commentId, userId)
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS comment_dislikes (
      id TEXT PRIMARY KEY,
      commentId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (commentId) REFERENCES comments(id) ON DELETE CASCADE,
      UNIQUE(commentId, userId)
    )
  `;

  // Create Fastify app
  app = Fastify({ logger: false });

  // Register core plugins
  await app.register(import('@fastify/cors'));
  await app.register(import('@fastify/sensible'));

  // Mock auth middleware
  app.decorate('authenticate', async function (request, reply) {
    // Mock JWT authentication for tests
    request.user = {
      id: userId,
      email: 'test@example.com',
      roles: ['user']
    };
  });

  // Register comment routes
  const commentsRoute = await import('../../src/routes/comments.js');
  await app.register(commentsRoute.default, { prefix: '/api' });

  // Setup test data
  userId = 'test-user-id-123';
  authToken = 'mock-jwt-token';

  testComment = {
    text: 'This is a test comment for e2e testing',
    authorId: userId
  };

  testComment2 = {
    text: 'This is another test comment for testing purposes',
    authorId: userId
  };

  await app.ready();
}, 60000);

afterAll(async () => {
  if (app) {
    await app.close();
  }
  if (prisma) {
    await prisma.$disconnect();
  }
  
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  const journalPath = testDbPath + '-journal';
  if (fs.existsSync(journalPath)) {
    fs.unlinkSync(journalPath);
  }
}, 30000);

describe('Comments Service E2E Tests', () => {
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

    test('should create reply comment with parentId', async () => {
      const replyComment = {
        text: 'This is a reply to the first comment',
        authorId: userId,
        parentId: createdCommentId
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: replyComment,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.parentId).toBe(createdCommentId);
      expect(body.data.text).toBe(replyComment.text);
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

    test('should filter comments by parentId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/comments?parentId=${createdCommentId}`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // Should return replies to the parent comment
      if (body.data.comments) {
        body.data.comments.forEach(comment => {
          expect(comment.parentId).toBe(createdCommentId);
        });
      }
    });

    test('should support sorting options', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments?sort=createdAt&order=desc'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
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

    test('should require authentication for likes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/comments/${createdCommentId}/like`
      });

      expect([401, 403]).toContain(response.statusCode);
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

      // Verify comment is deleted (soft delete)
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

  describe('Comment Search', () => {
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
  });

  describe('Security and Validation', () => {
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

    test('should validate text encoding with unicode', async () => {
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

  describe('Complete Comment Workflow', () => {
    test('should complete full comment lifecycle', async () => {
      // 1. Create comment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        payload: {
          text: 'Workflow test comment',
          authorId: userId
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const createdComment = JSON.parse(createResponse.body);
      const commentId = createdComment.data.id;

      // 2. Get comment
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/comments/${commentId}`
      });

      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(getResponse.body);
      expect(getBody.data.text).toBe('Workflow test comment');

      // 3. Update comment
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/comments/${commentId}`,
        payload: {
          text: 'Updated workflow test comment'
        },
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      const updateBody = JSON.parse(updateResponse.body);
      expect(updateBody.data.text).toBe('Updated workflow test comment');

      // 4. Like comment
      const likeResponse = await app.inject({
        method: 'POST',
        url: `/api/comments/${commentId}/like`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(likeResponse.statusCode).toBe(200);
      const likeBody = JSON.parse(likeResponse.body);
      expect(likeBody.data.likes).toBeGreaterThan(0);

      // 5. Delete comment
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${commentId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(deleteResponse.statusCode).toBe(200);

      // 6. Verify deletion
      const finalGetResponse = await app.inject({
        method: 'GET',
        url: `/api/comments/${commentId}`
      });

      expect(finalGetResponse.statusCode).toBe(404);
    });
  });
});