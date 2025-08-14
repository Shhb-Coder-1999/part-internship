/**
 * Unit Tests for Comment Validation Middleware
 * Tests input validation and sanitization
 */

import { jest } from '@jest/globals';
import { commentValidation } from '@app/middleware';
import { 
  createMockRequest, 
  createMockResponse, 
  createMockNext,
  generateMockCommentRequest,
  generateMockCommentUpdateRequest
} from '../helpers/testUtils';

describe('Comment Validation Middleware - Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('validateCreateComment', () => {
    it('should pass validation for valid comment data', () => {
      const validData = generateMockCommentRequest();
      mockReq.body = validData;

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject empty text', () => {
      mockReq.body = { text: '', parentId: null };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only text', () => {
      mockReq.body = { text: '   ', parentId: null };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text is required'
      });
    });

    it('should reject text that is too long', () => {
      const longText = 'a'.repeat(1001);
      mockReq.body = { text: longText, parentId: null };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text must be between 1 and 1000 characters'
      });
    });

    it('should reject text that is too short', () => {
      mockReq.body = { text: 'a', parentId: null };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text must be between 1 and 1000 characters'
      });
    });

    it('should accept valid text length', () => {
      const validText = 'a'.repeat(500);
      mockReq.body = { text: validText, parentId: null };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should accept valid parentId', () => {
      mockReq.body = { 
        text: 'Valid comment', 
        parentId: 'valid-parent-id' 
      };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should accept null parentId', () => {
      mockReq.body = { 
        text: 'Valid comment', 
        parentId: null 
      };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid parentId format', () => {
      mockReq.body = { 
        text: 'Valid comment', 
        parentId: 'invalid-format!' 
      };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid parent comment ID format'
      });
    });

    it('should reject missing text field', () => {
      mockReq.body = { parentId: null };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text is required'
      });
    });

    it('should reject non-string text', () => {
      mockReq.body = { text: 123, parentId: null };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text must be a string'
      });
    });

    it('should sanitize text by trimming whitespace', () => {
      const textWithWhitespace = '  Valid comment  ';
      mockReq.body = { text: textWithWhitespace, parentId: null };

      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);

      expect(mockReq.body.text).toBe('Valid comment');
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateUpdateComment', () => {
    it('should pass validation for valid update data', () => {
      const validData = generateMockCommentUpdateRequest();
      mockReq.body = validData;
      mockReq.params = { id: 'valid-comment-id' };

      commentValidation.validateUpdateComment(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject empty text', () => {
      mockReq.body = { text: '' };
      mockReq.params = { id: 'valid-comment-id' };

      commentValidation.validateUpdateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text is required'
      });
    });

    it('should reject text that is too long', () => {
      const longText = 'a'.repeat(1001);
      mockReq.body = { text: longText };
      mockReq.params = { id: 'valid-comment-id' };

      commentValidation.validateUpdateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text must be between 1 and 1000 characters'
      });
    });

    it('should reject text that is too short', () => {
      mockReq.body = { text: 'a' };
      mockReq.params = { id: 'valid-comment-id' };

      commentValidation.validateUpdateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text must be between 1 and 1000 characters'
      });
    });

    it('should reject missing comment ID', () => {
      mockReq.body = { text: 'Valid text' };
      mockReq.params = {};

      commentValidation.validateUpdateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment ID is required'
      });
    });

    it('should reject invalid comment ID format', () => {
      mockReq.body = { text: 'Valid text' };
      mockReq.params = { id: 'invalid-format!' };

      commentValidation.validateUpdateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid comment ID format'
      });
    });

    it('should reject missing text field', () => {
      mockReq.body = {};
      mockReq.params = { id: 'valid-comment-id' };

      commentValidation.validateUpdateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text is required'
      });
    });

    it('should reject non-string text', () => {
      mockReq.body = { text: 123 };
      mockReq.params = { id: 'valid-comment-id' };

      commentValidation.validateUpdateComment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment text must be a string'
      });
    });

    it('should sanitize text by trimming whitespace', () => {
      const textWithWhitespace = '  Updated comment  ';
      mockReq.body = { text: textWithWhitespace };
      mockReq.params = { id: 'valid-comment-id' };

      commentValidation.validateUpdateComment(mockReq, mockRes, mockNext);

      expect(mockReq.body.text).toBe('Updated comment');
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateCommentId', () => {
    it('should pass validation for valid comment ID', () => {
      mockReq.params = { id: 'valid-comment-id' };

      commentValidation.validateCommentId(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject missing comment ID', () => {
      mockReq.params = {};

      commentValidation.validateCommentId(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment ID is required'
      });
    });

    it('should reject empty comment ID', () => {
      mockReq.params = { id: '' };

      commentValidation.validateCommentId(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Comment ID is required'
      });
    });

    it('should reject invalid comment ID format', () => {
      mockReq.params = { id: 'invalid-format!' };

      commentValidation.validateCommentId(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid comment ID format'
      });
    });

    it('should reject comment ID with special characters', () => {
      mockReq.params = { id: 'comment@#$%' };

      commentValidation.validateCommentId(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid comment ID format'
      });
    });

    it('should accept comment ID with hyphens and underscores', () => {
      mockReq.params = { id: 'comment-id_with_underscores' };

      commentValidation.validateCommentId(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should accept comment ID with numbers', () => {
      mockReq.params = { id: 'comment123' };

      commentValidation.validateCommentId(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validatePagination', () => {
    it('should pass validation for valid pagination params', () => {
      mockReq.query = { page: '1', limit: '10' };

      commentValidation.validatePagination(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should use default values when pagination params are missing', () => {
      mockReq.query = {};

      commentValidation.validatePagination(mockReq, mockRes, mockNext);

      expect(mockReq.query.page).toBe('1');
      expect(mockReq.query.limit).toBe('20');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject negative page number', () => {
      mockReq.query = { page: '-1', limit: '10' };

      commentValidation.validatePagination(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Page must be a positive integer'
      });
    });

    it('should reject zero page number', () => {
      mockReq.query = { page: '0', limit: '10' };

      commentValidation.validatePagination(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Page must be a positive integer'
      });
    });

    it('should reject non-numeric page', () => {
      mockReq.query = { page: 'abc', limit: '10' };

      commentValidation.validatePagination(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Page must be a positive integer'
      });
    });

    it('should reject limit below minimum', () => {
      mockReq.query = { page: '1', limit: '0' };

      commentValidation.validatePagination(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    });

    it('should reject limit above maximum', () => {
      mockReq.query = { page: '1', limit: '101' };

      commentValidation.validatePagination(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    });

    it('should reject non-numeric limit', () => {
      mockReq.query = { page: '1', limit: 'abc' };

      commentValidation.validatePagination(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    });

    it('should convert string numbers to integers', () => {
      mockReq.query = { page: '5', limit: '25' };

      commentValidation.validatePagination(mockReq, mockRes, mockNext);

      expect(mockReq.query.page).toBe(5);
      expect(mockReq.query.limit).toBe(25);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
