/**
 * Unit Tests for Comment Utilities
 * Tests helper functions and utility methods
 */

import { jest } from '@jest/globals';
import {
  commentUtils,
  validateCommentIdStrict,
  sanitizeCommentText,
} from '@app/utils';
import {
  generateMockComment,
  generateMockCommentRequest,
} from '../helpers/testUtils';

describe('Comment Utils - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('textValidation', () => {
    it('should validate valid comment text', () => {
      const validText = 'This is a valid comment text';
      const result = commentUtils.textValidation(validText);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty text', () => {
      const emptyText = '';
      const result = commentUtils.textValidation(emptyText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('text is required');
    });

    it('should reject whitespace-only text', () => {
      const whitespaceText = '   ';
      const result = commentUtils.textValidation(whitespaceText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('text is required');
    });

    it('should reject text that is too short', () => {
      const shortText = '';
      const result = commentUtils.textValidation(shortText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('text is required');
    });

    it('should reject text that is too long', () => {
      const longText = 'a'.repeat(251);
      const result = commentUtils.textValidation(longText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain(
        'text must be no more than 250 characters long'
      );
    });

    it('should accept text at minimum length', () => {
      const minText = 'a';
      const result = commentUtils.textValidation(minText);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept text at maximum length', () => {
      const maxText = 'a'.repeat(250);
      const result = commentUtils.textValidation(maxText);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle null and undefined text', () => {
      const nullResult = commentUtils.textValidation(null);
      const undefinedResult = commentUtils.textValidation(undefined);

      expect(nullResult.isValid).toBe(false);
      expect(undefinedResult.isValid).toBe(false);
      expect(nullResult.errors[0].message).toBe(
        'Expected string, received null'
      );
      expect(undefinedResult.errors[0].message).toBe('text is required');
    });
  });

  describe('sanitizeText', () => {
    it('should trim whitespace from text', () => {
      const textWithWhitespace = '  Hello World  ';
      const result = commentUtils.sanitizeText(textWithWhitespace);

      expect(result).toBe('Hello World');
    });

    it('should handle text with only leading whitespace', () => {
      const textWithLeadingWhitespace = '  Hello World';
      const result = commentUtils.sanitizeText(textWithLeadingWhitespace);

      expect(result).toBe('Hello World');
    });

    it('should handle text with only trailing whitespace', () => {
      const textWithTrailingWhitespace = 'Hello World  ';
      const result = commentUtils.sanitizeText(textWithTrailingWhitespace);

      expect(result).toBe('Hello World');
    });

    it('should handle text with no whitespace', () => {
      const cleanText = 'Hello World';
      const result = commentUtils.sanitizeText(cleanText);

      expect(result).toBe('Hello World');
    });

    it('should handle empty string', () => {
      const emptyText = '';
      const result = commentUtils.sanitizeText(emptyText);

      expect(result).toBe('');
    });

    it('should handle whitespace-only string', () => {
      const whitespaceText = '   ';
      const result = commentUtils.sanitizeText(whitespaceText);

      expect(result).toBe('');
    });

    it('should handle null and undefined', () => {
      const nullResult = commentUtils.sanitizeText(null);
      const undefinedResult = commentUtils.sanitizeText(undefined);

      expect(nullResult).toBe('');
      expect(undefinedResult).toBe('');
    });

    it('should remove HTML tags', () => {
      const textWithHTML = '<script>alert("xss")</script>Hello <b>World</b>';
      const result = commentUtils.sanitizeText(textWithHTML);

      expect(result).toBe('alert("xss")Hello World');
    });

    it('should normalize multiple spaces', () => {
      const textWithSpaces = 'Hello    World   Test';
      const result = commentUtils.sanitizeText(textWithSpaces);

      expect(result).toBe('Hello World Test');
    });
  });

  describe('validateId', () => {
    it('should validate valid comment ID', () => {
      const validId = 'comment-123';
      const result = commentUtils.validateId(validId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid comment ID with underscores', () => {
      const validId = 'comment_id_123';
      const result = commentUtils.validateId(validId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid comment ID with numbers', () => {
      const validId = '123comment';
      const result = commentUtils.validateId(validId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty ID', () => {
      const emptyId = '';
      const result = commentUtils.validateId(emptyId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(
        result.errors.some(e => e.message.includes('id is required'))
      ).toBe(true);
    });

    it('should accept ID with special characters', () => {
      const specialId = 'comment@#$%';
      const result = commentUtils.validateId(specialId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept ID with spaces', () => {
      const spacedId = 'comment id';
      const result = commentUtils.validateId(spacedId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle null and undefined ID', () => {
      const nullResult = commentUtils.validateId(null);
      const undefinedResult = commentUtils.validateId(undefined);

      expect(nullResult.isValid).toBe(false);
      expect(undefinedResult.isValid).toBe(false);
      expect(nullResult.errors[0].message).toContain('id is required');
      expect(undefinedResult.errors[0].message).toContain('id is required');
    });
  });

  describe('validatePagination', () => {
    it('should validate valid pagination parameters', () => {
      const validParams = { page: 1, limit: 10 };
      const result = commentUtils.validatePagination(validParams);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should use default values for missing parameters', () => {
      const params = {};
      const result = commentUtils.validatePagination(params);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should reject negative page number', () => {
      const invalidParams = { page: -1, limit: 10 };
      const result = commentUtils.validatePagination(invalidParams);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Page must be greater than 0');
    });

    it('should reject zero page number', () => {
      const invalidParams = { page: 0, limit: 10 };
      const result = commentUtils.validatePagination(invalidParams);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Page must be greater than 0');
    });

    it('should reject limit below minimum', () => {
      const invalidParams = { page: 1, limit: 0 };
      const result = commentUtils.validatePagination(invalidParams);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Limit must be between 1 and 100');
    });

    it('should reject limit above maximum', () => {
      const invalidParams = { page: 1, limit: 101 };
      const result = commentUtils.validatePagination(invalidParams);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Limit must be between 1 and 100');
    });

    it('should convert string numbers to integers', () => {
      const stringParams = { page: '5', limit: '25' };
      const result = commentUtils.validatePagination(stringParams);

      expect(result.isValid).toBe(true);
      expect(result.page).toBe(5);
      expect(result.limit).toBe(25);
    });

    it('should handle non-numeric values', () => {
      const invalidParams = { page: 'abc', limit: 'def' };
      const result = commentUtils.validatePagination(invalidParams);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('formatComment', () => {
    it('should format comment with all fields', () => {
      const mockComment = generateMockComment();
      const result = commentUtils.formatComment(mockComment);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('likes');
      expect(result).toHaveProperty('dislikes');
    });

    it('should exclude sensitive fields', () => {
      const mockComment = generateMockComment();
      const result = commentUtils.formatComment(mockComment);

      expect(result).not.toHaveProperty('isDeleted');
      expect(result).not.toHaveProperty('internalId');
    });

    it('should format dates correctly', () => {
      const mockComment = generateMockComment();
      const result = commentUtils.formatComment(mockComment);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle comment with null values', () => {
      const mockComment = generateMockComment({
        parentId: null,
        replies: null,
      });
      const result = commentUtils.formatComment(mockComment);

      expect(result.parentId).toBeNull();
      expect(result.replies).toBeNull();
    });

    it('should handle comment with undefined values', () => {
      const mockComment = generateMockComment({
        parentId: undefined,
        replies: undefined,
      });
      const result = commentUtils.formatComment(mockComment);

      expect(result.parentId).toBeUndefined();
      expect(result.replies).toBeUndefined();
    });
  });

  describe('calculatePagination', () => {
    it('should calculate pagination correctly', () => {
      const total = 100;
      const page = 3;
      const limit = 25;
      const result = commentUtils.calculatePagination(total, page, limit);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(4);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle first page', () => {
      const total = 50;
      const page = 1;
      const limit = 20;
      const result = commentUtils.calculatePagination(total, page, limit);

      expect(result.page).toBe(1);
      expect(result.hasPrev).toBe(false);
      expect(result.hasNext).toBe(true);
    });

    it('should handle last page', () => {
      const total = 50;
      const page = 3;
      const limit = 20;
      const result = commentUtils.calculatePagination(total, page, limit);

      expect(result.page).toBe(3);
      expect(result.hasPrev).toBe(true);
      expect(result.hasNext).toBe(false);
    });

    it('should handle single page', () => {
      const total = 10;
      const page = 1;
      const limit = 20;
      const result = commentUtils.calculatePagination(total, page, limit);

      expect(result.totalPages).toBe(1);
      expect(result.hasPrev).toBe(false);
      expect(result.hasNext).toBe(false);
    });

    it('should handle zero total', () => {
      const total = 0;
      const page = 1;
      const limit = 20;
      const result = commentUtils.calculatePagination(total, page, limit);

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasPrev).toBe(false);
      expect(result.hasNext).toBe(false);
    });
  });

  describe('searchComments', () => {
    it('should search comments by text', () => {
      const comments = [
        generateMockComment({ text: 'First test comment' }),
        generateMockComment({ text: 'Second test comment' }),
        generateMockComment({ text: 'Another comment' }),
      ];
      const searchTerm = 'test';
      const result = commentUtils.searchComments(comments, searchTerm);

      expect(result).toHaveLength(2);
      expect(result[0].text).toContain('test');
      expect(result[1].text).toContain('test');
    });

    it('should perform case-insensitive search', () => {
      const comments = [
        generateMockComment({ text: 'Test Comment' }),
        generateMockComment({ text: 'test comment' }),
        generateMockComment({ text: 'TEST COMMENT' }),
      ];
      const searchTerm = 'test';
      const result = commentUtils.searchComments(comments, searchTerm);

      expect(result).toHaveLength(3);
    });

    it('should return empty array for no matches', () => {
      const comments = [
        generateMockComment({ text: 'First comment' }),
        generateMockComment({ text: 'Second comment' }),
      ];
      const searchTerm = 'nonexistent';
      const result = commentUtils.searchComments(comments, searchTerm);

      expect(result).toHaveLength(0);
    });

    it('should handle empty search term', () => {
      const comments = [
        generateMockComment({ text: 'First comment' }),
        generateMockComment({ text: 'Second comment' }),
      ];
      const searchTerm = '';
      const result = commentUtils.searchComments(comments, searchTerm);

      expect(result).toHaveLength(2);
    });

    it('should handle null and undefined search term', () => {
      const comments = [
        generateMockComment({ text: 'First comment' }),
        generateMockComment({ text: 'Second comment' }),
      ];
      const nullResult = commentUtils.searchComments(comments, null);
      const undefinedResult = commentUtils.searchComments(comments, undefined);

      expect(nullResult).toHaveLength(2);
      expect(undefinedResult).toHaveLength(2);
    });
  });

  describe('sortComments', () => {
    it('should sort comments by creation date (newest first)', () => {
      const comments = [
        generateMockComment({
          id: 'old',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        }),
        generateMockComment({
          id: 'new',
          createdAt: new Date('2024-01-02T00:00:00Z'),
        }),
        generateMockComment({
          id: 'middle',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        }),
      ];

      const result = commentUtils.sortComments(comments, 'createdAt', 'desc');

      expect(result[0].id).toBe('new');
      expect(result[1].id).toBe('middle');
      expect(result[2].id).toBe('old');
    });

    it('should sort comments by creation date (oldest first)', () => {
      const comments = [
        generateMockComment({
          id: 'old',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        }),
        generateMockComment({
          id: 'new',
          createdAt: new Date('2024-01-02T00:00:00Z'),
        }),
      ];

      const result = commentUtils.sortComments(comments, 'createdAt', 'asc');

      expect(result[0].id).toBe('old');
      expect(result[1].id).toBe('new');
    });

    it('should sort comments by likes (highest first)', () => {
      const comments = [
        generateMockComment({ id: 'low', likes: 1 }),
        generateMockComment({ id: 'high', likes: 10 }),
        generateMockComment({ id: 'medium', likes: 5 }),
      ];

      const result = commentUtils.sortComments(comments, 'likes', 'desc');

      expect(result[0].id).toBe('high');
      expect(result[1].id).toBe('medium');
      expect(result[2].id).toBe('low');
    });

    it('should handle empty array', () => {
      const comments = [];
      const result = commentUtils.sortComments(comments, 'createdAt', 'desc');

      expect(result).toHaveLength(0);
    });

    it('should handle single comment', () => {
      const comments = [generateMockComment()];
      const result = commentUtils.sortComments(comments, 'createdAt', 'desc');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(comments[0]);
    });
  });

  describe('filterComments', () => {
    it('should filter comments by user ID', () => {
      const comments = [
        generateMockComment({ userId: 'user1' }),
        generateMockComment({ userId: 'user2' }),
        generateMockComment({ userId: 'user1' }),
      ];

      const result = commentUtils.filterComments(comments, 'userId', 'user1');

      expect(result).toHaveLength(2);
      result.forEach(comment => {
        expect(comment.userId).toBe('user1');
      });
    });

    it('should filter comments by parent ID', () => {
      const comments = [
        generateMockComment({ parentId: null }),
        generateMockComment({ parentId: 'parent1' }),
        generateMockComment({ parentId: 'parent2' }),
        generateMockComment({ parentId: 'parent1' }),
      ];

      const result = commentUtils.filterComments(
        comments,
        'parentId',
        'parent1'
      );

      expect(result).toHaveLength(2);
      result.forEach(comment => {
        expect(comment.parentId).toBe('parent1');
      });
    });

    it('should filter comments by boolean values', () => {
      const comments = [
        generateMockComment({ isDeleted: false }),
        generateMockComment({ isDeleted: true }),
        generateMockComment({ isDeleted: false }),
      ];

      const result = commentUtils.filterComments(comments, 'isDeleted', false);

      expect(result).toHaveLength(2);
      result.forEach(comment => {
        expect(comment.isDeleted).toBe(false);
      });
    });

    it('should return empty array for no matches', () => {
      const comments = [
        generateMockComment({ userId: 'user1' }),
        generateMockComment({ userId: 'user2' }),
      ];

      const result = commentUtils.filterComments(comments, 'userId', 'user3');

      expect(result).toHaveLength(0);
    });

    it('should handle empty array', () => {
      const comments = [];
      const result = commentUtils.filterComments(comments, 'userId', 'user1');

      expect(result).toHaveLength(0);
    });
  });

  describe('validateCommentIdStrict', () => {
    it('should validate valid comment ID with strict format', () => {
      const validId = 'comment-123';
      const result = validateCommentIdStrict(validId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid comment ID with underscores', () => {
      const validId = 'comment_id_123';
      const result = validateCommentIdStrict(validId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject ID with special characters', () => {
      const specialId = 'comment@#$%';
      const result = validateCommentIdStrict(specialId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Invalid comment ID format']);
    });

    it('should reject ID with spaces', () => {
      const spacedId = 'comment id';
      const result = validateCommentIdStrict(spacedId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Invalid comment ID format']);
    });

    it('should reject empty ID', () => {
      const emptyId = '';
      const result = validateCommentIdStrict(emptyId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(
        result.errors.some(
          e =>
            e.message &&
            e.message.includes('id must be at least 1 characters long')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          e => e.message && e.message.includes('Invalid comment ID format')
        )
      ).toBe(true);
    });

    it('should handle null and undefined ID', () => {
      const nullResult = validateCommentIdStrict(null);
      const undefinedResult = validateCommentIdStrict(undefined);

      expect(nullResult.isValid).toBe(false);
      expect(undefinedResult.isValid).toBe(false);
    });
  });

  describe('sanitizeCommentText standalone', () => {
    it('should sanitize text correctly', () => {
      const dirtyText = '<script>alert("xss")</script>Hello   <b>World</b>   ';
      const result = sanitizeCommentText(dirtyText);

      expect(result).toBe('alert("xss")Hello World');
    });

    it('should handle empty and null inputs', () => {
      expect(sanitizeCommentText('')).toBe('');
      expect(sanitizeCommentText(null)).toBe('');
      expect(sanitizeCommentText(undefined)).toBe('');
    });
  });
});
