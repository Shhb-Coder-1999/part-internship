/**
 * Comments E2E Workflow Tests
 * Tests complete comment workflows and user scenarios
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fastify from '../../server.js';

describe('Comments E2E Workflow Tests', () => {
  let app;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = fastify;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Complete Comment Lifecycle', () => {
    const user1Headers = {
      'x-user-id': 'workflow-user-1',
      'x-user-email': 'user1@example.com',
      'x-user-roles': JSON.stringify(['user']),
      'x-gateway-forwarded': 'true'
    };

    const user2Headers = {
      'x-user-id': 'workflow-user-2',
      'x-user-email': 'user2@example.com',
      'x-user-roles': JSON.stringify(['user']),
      'x-gateway-forwarded': 'true'
    };

    let mainCommentId = null;
    let replyCommentId = null;

    test('User creates a main comment', async () => {
      const commentData = {
        text: 'This is a main comment for E2E testing. It discusses important topics!'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: user1Headers,
        payload: commentData
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe(commentData.text);
      expect(body.data.id).toBeDefined();
      expect(body.data.likes).toBe(0);
      expect(body.data.dislikes).toBe(0);
      
      mainCommentId = body.data.id;
    });

    test('Another user replies to the comment', async () => {
      expect(mainCommentId).toBeDefined();

      const replyData = {
        text: 'This is a thoughtful reply to the main comment!',
        parentId: mainCommentId
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: user2Headers,
        payload: replyData
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe(replyData.text);
      expect(body.data.parentId).toBe(mainCommentId);
      
      replyCommentId = body.data.id;
    });

    test('User 2 likes the main comment', async () => {
      expect(mainCommentId).toBeDefined();

      const response = await app.inject({
        method: 'POST',
        url: `/api/comments/${mainCommentId}/like`,
        headers: user2Headers
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.likes).toBe(1);
    });

    test('User 1 likes their own reply (from user 2)', async () => {
      expect(replyCommentId).toBeDefined();

      const response = await app.inject({
        method: 'POST',
        url: `/api/comments/${replyCommentId}/like`,
        headers: user1Headers
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.likes).toBe(1);
    });

    test('User 1 updates their original comment', async () => {
      expect(mainCommentId).toBeDefined();

      const updateData = {
        text: 'This is an UPDATED main comment for E2E testing. Now with more content!'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/comments/${mainCommentId}`,
        headers: user1Headers,
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.text).toBe(updateData.text);
      expect(new Date(body.data.updatedAt)).toBeInstanceOf(Date);
    });

    test('Both users can see the thread in public listing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toBeDefined();
      
      // Find our comments in the list
      const mainComment = body.data.comments.find(c => c.id === mainCommentId);
      const replyComment = body.data.comments.find(c => c.id === replyCommentId);
      
      expect(mainComment).toBeDefined();
      expect(replyComment).toBeDefined();
      expect(mainComment.likes).toBe(1);
      expect(replyComment.likes).toBe(1);
    });

    test('Users can search for their comments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/search?q=UPDATED'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments.length).toBeGreaterThan(0);
      
      const foundComment = body.data.comments.find(c => c.id === mainCommentId);
      expect(foundComment).toBeDefined();
    });

    test('User 1 can view their private comments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/my',
        headers: user1Headers
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toBeDefined();
      
      // Should include their main comment
      const myComment = body.data.comments.find(c => c.id === mainCommentId);
      expect(myComment).toBeDefined();
    });

    test('User 2 can view their private comments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/my',
        headers: user2Headers
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toBeDefined();
      
      // Should include their reply
      const myComment = body.data.comments.find(c => c.id === replyCommentId);
      expect(myComment).toBeDefined();
    });

    test('User 1 soft deletes their comment', async () => {
      expect(mainCommentId).toBeDefined();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${mainCommentId}`,
        headers: user1Headers
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    test('Deleted comment is not visible in public listing by default', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      const deletedComment = body.data.comments.find(c => c.id === mainCommentId);
      
      // Should either not be present or marked as deleted
      if (deletedComment) {
        expect(deletedComment.deletedAt).toBeDefined();
      }
    });

    test('Reply comment is still visible after parent deletion', async () => {
      expect(replyCommentId).toBeDefined();

      const response = await app.inject({
        method: 'GET',
        url: `/api/comments/${replyCommentId}`
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(replyCommentId);
    });
  });

  describe('Bulk Operations and Statistics', () => {
    const batchUserHeaders = {
      'x-user-id': 'batch-user',
      'x-user-email': 'batch@example.com',
      'x-user-roles': JSON.stringify(['user']),
      'x-gateway-forwarded': 'true'
    };

    test('Creating multiple comments and checking statistics', async () => {
      // Get initial stats
      const initialStatsResponse = await app.inject({
        method: 'GET',
        url: '/api/comments/stats'
      });

      const initialStats = JSON.parse(initialStatsResponse.body);
      const initialTotal = initialStats.data.totalComments;

      // Create multiple comments
      const commentTexts = [
        'First batch comment about technology',
        'Second batch comment about programming',
        'Third batch comment about testing',
        'Fourth batch comment about automation',
        'Fifth batch comment about workflows'
      ];

      const createdComments = [];
      for (const text of commentTexts) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/comments',
          headers: batchUserHeaders,
          payload: { text }
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        createdComments.push(body.data.id);
      }

      // Check updated stats
      const finalStatsResponse = await app.inject({
        method: 'GET',
        url: '/api/comments/stats'
      });

      expect(finalStatsResponse.statusCode).toBe(200);
      
      const finalStats = JSON.parse(finalStatsResponse.body);
      expect(finalStats.data.totalComments).toBe(initialTotal + commentTexts.length);
      expect(finalStats.data.activeComments).toBeGreaterThan(initialStats.data.activeComments);

      // Like some comments
      await app.inject({
        method: 'POST',
        url: `/api/comments/${createdComments[0]}/like`,
        headers: batchUserHeaders
      });

      await app.inject({
        method: 'POST',
        url: `/api/comments/${createdComments[1]}/like`,
        headers: batchUserHeaders
      });

      // Check that total likes increased
      const likeStatsResponse = await app.inject({
        method: 'GET',
        url: '/api/comments/stats'
      });

      const likeStats = JSON.parse(likeStatsResponse.body);
      expect(likeStats.data.totalLikes).toBeGreaterThanOrEqual(2);
    });

    test('Searching through batch comments', async () => {
      const searchResponse = await app.inject({
        method: 'GET',
        url: '/api/comments/search?q=batch'
      });

      expect(searchResponse.statusCode).toBe(200);
      
      const body = JSON.parse(searchResponse.body);
      expect(body.success).toBe(true);
      expect(body.data.comments.length).toBeGreaterThanOrEqual(5);
      expect(body.data.query).toBe('batch');
    });

    test('Pagination with batch comments', async () => {
      const page1Response = await app.inject({
        method: 'GET',
        url: '/api/comments?page=1&limit=3'
      });

      expect(page1Response.statusCode).toBe(200);
      
      const page1Body = JSON.parse(page1Response.body);
      expect(page1Body.data.comments.length).toBeLessThanOrEqual(3);
      expect(page1Body.data.pagination.page).toBe(1);
      expect(page1Body.data.pagination.limit).toBe(3);

      if (page1Body.data.pagination.hasNext) {
        const page2Response = await app.inject({
          method: 'GET',
          url: '/api/comments?page=2&limit=3'
        });

        expect(page2Response.statusCode).toBe(200);
        
        const page2Body = JSON.parse(page2Response.body);
        expect(page2Body.data.pagination.page).toBe(2);
        
        // Comments on page 2 should be different from page 1
        const page1Ids = page1Body.data.comments.map(c => c.id);
        const page2Ids = page2Body.data.comments.map(c => c.id);
        const intersection = page1Ids.filter(id => page2Ids.includes(id));
        expect(intersection.length).toBe(0);
      }
    });
  });

  describe('Default Comments Workflow', () => {
    test('Creating default comments for new users', async () => {
      const newUserHeaders = {
        'x-user-id': 'new-user-defaults',
        'x-user-email': 'newuser@example.com',
        'x-user-roles': JSON.stringify(['user']),
        'x-gateway-forwarded': 'true'
      };

      // Create default comments
      const defaultsResponse = await app.inject({
        method: 'POST',
        url: '/api/comments/defaults',
        headers: newUserHeaders
      });

      expect(defaultsResponse.statusCode).toBe(201);
      
      const defaultsBody = JSON.parse(defaultsResponse.body);
      expect(defaultsBody.success).toBe(true);
      expect(defaultsBody.data.count).toBeGreaterThan(0);
      expect(defaultsBody.data.comments).toBeDefined();

      // Verify the user can see their default comments
      const myCommentsResponse = await app.inject({
        method: 'GET',
        url: '/api/comments/my',
        headers: newUserHeaders
      });

      expect(myCommentsResponse.statusCode).toBe(200);
      
      const myCommentsBody = JSON.parse(myCommentsResponse.body);
      expect(myCommentsBody.data.comments.length).toBeGreaterThanOrEqual(defaultsBody.data.count);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    const edgeCaseUserHeaders = {
      'x-user-id': 'edge-case-user',
      'x-user-email': 'edgecase@example.com',
      'x-user-roles': JSON.stringify(['user']),
      'x-gateway-forwarded': 'true'
    };

    test('Handling very long comment text', async () => {
      const longText = 'A'.repeat(500); // Very long comment

      const response = await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: edgeCaseUserHeaders,
        payload: { text: longText }
      });

      // Should either accept it or reject it gracefully
      expect([201, 400]).toContain(response.statusCode);

      if (response.statusCode === 201) {
        const body = JSON.parse(response.body);
        expect(body.data.text).toBe(longText);
      }
    });

    test('Handling empty search queries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/comments/search?q='
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.query).toBe('');
    });

    test('Handling operations on non-existent comments', async () => {
      const nonExistentId = 'definitely-not-a-real-id';

      // Try to like non-existent comment
      const likeResponse = await app.inject({
        method: 'POST',
        url: `/api/comments/${nonExistentId}/like`,
        headers: edgeCaseUserHeaders
      });

      expect(likeResponse.statusCode).toBe(404);

      // Try to update non-existent comment
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/comments/${nonExistentId}`,
        headers: edgeCaseUserHeaders,
        payload: { text: 'This should fail' }
      });

      expect(updateResponse.statusCode).toBe(404);

      // Try to delete non-existent comment
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${nonExistentId}`,
        headers: edgeCaseUserHeaders
      });

      expect(deleteResponse.statusCode).toBe(404);
    });

    test('Concurrent operations on the same comment', async () => {
      // Create a comment first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/comments',
        headers: edgeCaseUserHeaders,
        payload: { text: 'Comment for concurrent testing' }
      });

      const commentId = JSON.parse(createResponse.body).data.id;

      // Perform multiple like operations concurrently
      const likePromises = Array(5).fill(null).map(() =>
        app.inject({
          method: 'POST',
          url: `/api/comments/${commentId}/like`,
          headers: {
            ...edgeCaseUserHeaders,
            'x-user-id': `user-${Math.random()}` // Different users
          }
        })
      );

      const likeResults = await Promise.all(likePromises);
      
      // All should either succeed or handle conflicts gracefully
      likeResults.forEach(result => {
        expect([200, 409]).toContain(result.statusCode);
      });

      // Check final state
      const finalResponse = await app.inject({
        method: 'GET',
        url: `/api/comments/${commentId}`
      });

      expect(finalResponse.statusCode).toBe(200);
      
      const finalBody = JSON.parse(finalResponse.body);
      expect(typeof finalBody.data.likes).toBe('number');
    });
  });
});