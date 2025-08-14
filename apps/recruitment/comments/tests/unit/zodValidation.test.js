/**
 * Unit Tests for Zod Validation Middleware
 * Tests the new Zod-based validation system
 */

import { jest } from '@jest/globals';
import { makeZodValidator } from '@app/middleware';
import {
  CreateCommentBody,
  UpdateCommentParams,
  UpdateCommentBody,
  CommentIdParams,
  SearchQuery,
  ListCommentsQuery,
} from '@app/schemas';
import { HTTP_STATUS } from '@app/constants';

describe('Zod Validation Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('makeZodValidator', () => {
    it('should create a validator function', () => {
      const validator = makeZodValidator({ body: CreateCommentBody });
      expect(typeof validator).toBe('function');
    });

    it('should pass valid data through', () => {
      const validator = makeZodValidator({ body: CreateCommentBody });
      req.body = { text: 'Valid comment text' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should reject invalid data with error response', () => {
      const validator = makeZodValidator({ body: CreateCommentBody });
      req.body = { text: '' }; // Empty text should fail

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should use custom formatError function', () => {
      const customFormatError = jest.fn(() => 'Custom error message');
      const validator = makeZodValidator(
        { body: CreateCommentBody },
        { formatError: customFormatError }
      );
      req.body = { text: '' };

      validator(req, res, next);

      expect(customFormatError).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Custom error message',
      });
    });
  });

  describe('CreateCommentBody validation', () => {
    let validator;

    beforeEach(() => {
      validator = makeZodValidator({ body: CreateCommentBody });
    });

    it('should validate valid comment creation', () => {
      req.body = {
        text: 'This is a valid comment',
        parentId: null,
      };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.text).toBe('This is a valid comment');
    });

    it('should trim whitespace from text', () => {
      req.body = {
        text: '  This is a comment with whitespace  ',
      };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.text).toBe('This is a comment with whitespace');
    });

    it('should reject empty text', () => {
      req.body = { text: '' };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Comment text is required'),
      });
    });

    it('should reject text that is too long', () => {
      req.body = { text: 'a'.repeat(1001) };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining(
          'Comment text must be between 1 and 1000 characters'
        ),
      });
    });

    it('should validate valid parentId', () => {
      req.body = {
        text: 'This is a reply',
        parentId: 'valid-parent-id',
      };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject invalid parentId format', () => {
      req.body = {
        text: 'This is a reply',
        parentId: 'invalid@parent#id',
      };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Invalid parent comment ID format'),
      });
    });
  });

  describe('CommentIdParams validation', () => {
    let validator;

    beforeEach(() => {
      validator = makeZodValidator({ params: CommentIdParams });
    });

    it('should validate valid comment ID', () => {
      req.params = { id: 'valid-comment-id' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject empty comment ID', () => {
      req.params = { id: '' };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Comment ID is required'),
      });
    });

    it('should reject invalid comment ID format', () => {
      req.params = { id: 'invalid@comment#id' };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Invalid comment ID format'),
      });
    });
  });

  describe('UpdateCommentBody validation', () => {
    let validator;

    beforeEach(() => {
      validator = makeZodValidator({ body: UpdateCommentBody });
    });

    it('should validate valid update data', () => {
      req.body = { text: 'Updated comment text' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject empty update text', () => {
      req.body = { text: '' };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('SearchQuery validation', () => {
    let validator;

    beforeEach(() => {
      validator = makeZodValidator({ query: SearchQuery });
    });

    it('should validate valid search query', () => {
      req.query = { q: 'search term', limit: '10' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.limit).toBe(10); // Should be coerced to number
    });

    it('should reject empty search term', () => {
      req.query = { q: '' };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Search term is required'),
      });
    });

    it('should apply default limit', () => {
      req.query = { q: 'search term' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.limit).toBe(10); // Default value
    });

    it('should reject limit out of bounds', () => {
      req.query = { q: 'search term', limit: '150' };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('ListCommentsQuery validation', () => {
    let validator;

    beforeEach(() => {
      validator = makeZodValidator({ query: ListCommentsQuery });
    });

    it('should validate valid list query', () => {
      req.query = { page: '1', limit: '20' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(20);
    });

    it('should apply default values', () => {
      req.query = {};

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(20);
    });

    it('should coerce string page to number', () => {
      req.query = { page: '5' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(5);
    });

    it('should reject negative page', () => {
      req.query = { page: '-1' };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should reject zero page', () => {
      req.query = { page: '0' };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should validate parentId filter', () => {
      req.query = { parentId: 'valid-parent-id' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject invalid parentId format', () => {
      req.query = { parentId: 'invalid@parent#id' };

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should handle includeDeleted boolean conversion', () => {
      req.query = { includeDeleted: 'true' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.includeDeleted).toBe(true);
    });

    it('should handle includeDeleted false string', () => {
      req.query = { includeDeleted: 'false' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.includeDeleted).toBe(false);
    });
  });

  describe('Combined validation', () => {
    it('should validate multiple schemas at once', () => {
      const validator = makeZodValidator({
        params: UpdateCommentParams,
        body: UpdateCommentBody,
      });

      req.params = { id: 'valid-comment-id' };
      req.body = { text: 'Updated text' };

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should fail if any schema fails', () => {
      const validator = makeZodValidator({
        params: UpdateCommentParams,
        body: UpdateCommentBody,
      });

      req.params = { id: 'valid-comment-id' };
      req.body = { text: '' }; // Invalid body

      validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should pass non-Zod errors to next', () => {
      const validator = makeZodValidator({ body: CreateCommentBody });
      const nonZodError = new Error('Some other error');

      // Mock the parse method to throw a non-Zod error
      CreateCommentBody.parse = jest.fn(() => {
        throw nonZodError;
      });

      validator(req, res, next);

      expect(next).toHaveBeenCalledWith(nonZodError);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
