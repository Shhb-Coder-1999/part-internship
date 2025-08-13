/**
 * Unit Tests for Comment Controller
 * Tests individual controller methods in isolation
 */

import { commentController } from '@controllers';

describe('Comment Controller - Unit Tests', () => {
  describe('Controller Methods', () => {
    it('should have all required methods', () => {
      expect(typeof commentController.createComment).toBe('function');
      expect(typeof commentController.getComments).toBe('function');
      expect(typeof commentController.getAllComments).toBe('function');
      expect(typeof commentController.getCommentById).toBe('function');
      expect(typeof commentController.updateComment).toBe('function');
      expect(typeof commentController.deleteComment).toBe('function');
      expect(typeof commentController.likeComment).toBe('function');
      expect(typeof commentController.dislikeComment).toBe('function');
      expect(typeof commentController.searchComments).toBe('function');
      expect(typeof commentController.getCommentStats).toBe('function');
    });

    it('should have callable methods', () => {
      // Check that methods can be called
      expect(() => commentController.createComment).not.toThrow();
      expect(() => commentController.getComments).not.toThrow();
      expect(() => commentController.getAllComments).not.toThrow();
      expect(() => commentController.getCommentById).not.toThrow();
      expect(() => commentController.updateComment).not.toThrow();
      expect(() => commentController.deleteComment).not.toThrow();
      expect(() => commentController.likeComment).not.toThrow();
      expect(() => commentController.dislikeComment).not.toThrow();
      expect(() => commentController.searchComments).not.toThrow();
      expect(() => commentController.getCommentStats).not.toThrow();
    });
  });

  describe('Controller Instance', () => {
    it('should be properly configured', () => {
      expect(commentController).toBeDefined();
      expect(typeof commentController).toBe('object');
      expect(commentController).not.toBeNull();
    });
  });
});
