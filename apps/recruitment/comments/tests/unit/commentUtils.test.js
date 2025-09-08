/**
 * Comment Utils Unit Tests
 * Tests utility functions for comment processing
 */

import { describe, test, expect } from '@jest/globals';
import { commentUtils } from '../../src/utils/commentUtils.js';

describe('Comment Utils', () => {
  describe('sanitizeText', () => {
    test('should remove HTML tags', () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const expected = 'Hello world!';
      expect(commentUtils.sanitizeText(input)).toBe(expected);
    });

    test('should replace multiple spaces with single space', () => {
      const input = 'Hello     world    !';
      const expected = 'Hello world !';
      expect(commentUtils.sanitizeText(input)).toBe(expected);
    });

    test('should trim leading and trailing whitespace', () => {
      const input = '   Hello world   ';
      const expected = 'Hello world';
      expect(commentUtils.sanitizeText(input)).toBe(expected);
    });

    test('should handle empty string', () => {
      expect(commentUtils.sanitizeText('')).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(commentUtils.sanitizeText(null)).toBe('');
      expect(commentUtils.sanitizeText(undefined)).toBe('');
    });

    test('should handle complex HTML with multiple tags', () => {
      const input = '<div><p>Hello</p><script>alert("hack")</script><strong>world</strong></div>';
      const expected = 'Helloalert("hack")world';
      expect(commentUtils.sanitizeText(input)).toBe(expected);
    });
  });

  describe('formatComment', () => {
    test('should format comment object correctly', () => {
      const input = {
        id: 'comment123',
        text: 'Hello world',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:35:00Z',
        isDeleted: false,
        internalId: 'internal123'
      };

      const result = commentUtils.formatComment(input);

      expect(result).toEqual({
        id: 'comment123',
        text: 'Hello world',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:35:00Z')
      });
      expect(result.isDeleted).toBeUndefined();
      expect(result.internalId).toBeUndefined();
    });

    test('should handle null input', () => {
      expect(commentUtils.formatComment(null)).toBe(null);
    });

    test('should handle comment without dates', () => {
      const input = {
        id: 'comment123',
        text: 'Hello world',
        createdAt: null,
        updatedAt: null
      };

      const result = commentUtils.formatComment(input);

      expect(result.createdAt).toBe(null);
      expect(result.updatedAt).toBe(null);
    });
  });

  describe('validatePagination', () => {
    test('should return default values for empty params', () => {
      const result = commentUtils.validatePagination({});
      expect(result).toEqual({
        page: 1,
        limit: 20
      });
    });

    test('should parse valid string numbers', () => {
      const result = commentUtils.validatePagination({
        page: '3',
        limit: '50'
      });
      expect(result).toEqual({
        page: 3,
        limit: 50
      });
    });

    test('should enforce minimum page value', () => {
      const result = commentUtils.validatePagination({
        page: -1,
        limit: 10
      });
      expect(result).toEqual({
        page: 1,
        limit: 10
      });
    });

    test('should enforce maximum limit value', () => {
      const result = commentUtils.validatePagination({
        page: 1,
        limit: 200
      });
      expect(result).toEqual({
        page: 1,
        limit: 100
      });
    });

    test('should handle invalid string values', () => {
      const result = commentUtils.validatePagination({
        page: 'invalid',
        limit: 'also-invalid'
      });
      expect(result).toEqual({
        page: 1,
        limit: 20
      });
    });
  });

  describe('calculatePagination', () => {
    test('should calculate pagination metadata correctly', () => {
      const result = commentUtils.calculatePagination(25, 2, 10);
      
      expect(result).toEqual({
        page: 2,
        totalPages: 3,
        total: 25,
        limit: 10,
        hasNext: true,
        hasPrev: true,
        offset: 10
      });
    });

    test('should handle first page', () => {
      const result = commentUtils.calculatePagination(25, 1, 10);
      
      expect(result.page).toBe(1);
      expect(result.hasPrev).toBe(false);
      expect(result.hasNext).toBe(true);
      expect(result.offset).toBe(0);
    });

    test('should handle last page', () => {
      const result = commentUtils.calculatePagination(25, 3, 10);
      
      expect(result.page).toBe(3);
      expect(result.hasPrev).toBe(true);
      expect(result.hasNext).toBe(false);
      expect(result.offset).toBe(20);
    });

    test('should handle single page', () => {
      const result = commentUtils.calculatePagination(5, 1, 10);
      
      expect(result).toEqual({
        page: 1,
        totalPages: 1,
        total: 5,
        limit: 10,
        hasNext: false,
        hasPrev: false,
        offset: 0
      });
    });

    test('should handle zero total', () => {
      const result = commentUtils.calculatePagination(0, 1, 10);
      
      expect(result).toEqual({
        page: 1,
        totalPages: 0,
        total: 0,
        limit: 10,
        hasNext: false,
        hasPrev: false,
        offset: 0
      });
    });

    test('should handle page beyond total pages', () => {
      const result = commentUtils.calculatePagination(25, 10, 10);
      
      expect(result.page).toBe(3); // Should be clamped to max page
      expect(result.totalPages).toBe(3);
    });
  });

  describe('searchComments', () => {
    const sampleComments = [
      { id: '1', text: 'This is a great post!' },
      { id: '2', text: 'I love JavaScript' },
      { id: '3', text: 'React is awesome' },
      { id: '4', text: 'Vue is also great' },
      { id: '5', text: 'Angular has its merits' }
    ];

    test('should return all comments if no search term', () => {
      const result = commentUtils.searchComments(sampleComments, '');
      expect(result).toEqual(sampleComments);
    });

    test('should return all comments if search term is null/undefined', () => {
      expect(commentUtils.searchComments(sampleComments, null)).toEqual(sampleComments);
      expect(commentUtils.searchComments(sampleComments, undefined)).toEqual(sampleComments);
    });

    test('should filter comments by search term (case insensitive)', () => {
      const result = commentUtils.searchComments(sampleComments, 'great');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('4');
    });

    test('should filter comments by partial match', () => {
      const result = commentUtils.searchComments(sampleComments, 'is');
      expect(result).toHaveLength(3); // 'This is', 'is awesome', 'is also' (note: 'its' does not contain 'is')
    });

    test('should return empty array if no matches', () => {
      const result = commentUtils.searchComments(sampleComments, 'xyz123');
      expect(result).toEqual([]);
    });
  });

  describe('sortComments', () => {
    const sampleComments = [
      { id: '1', text: 'First', createdAt: new Date('2024-01-15T10:00:00Z'), likes: 5 },
      { id: '2', text: 'Second', createdAt: new Date('2024-01-15T11:00:00Z'), likes: 2 },
      { id: '3', text: 'Third', createdAt: new Date('2024-01-15T09:00:00Z'), likes: 10 }
    ];

    test('should sort by createdAt descending by default', () => {
      const result = commentUtils.sortComments(sampleComments);
      expect(result.map(c => c.id)).toEqual(['2', '1', '3']);
    });

    test('should sort by createdAt ascending', () => {
      const result = commentUtils.sortComments(sampleComments, 'createdAt', 'asc');
      expect(result.map(c => c.id)).toEqual(['3', '1', '2']);
    });

    test('should sort by likes descending', () => {
      const result = commentUtils.sortComments(sampleComments, 'likes', 'desc');
      expect(result.map(c => c.id)).toEqual(['3', '1', '2']);
    });

    test('should sort by likes ascending', () => {
      const result = commentUtils.sortComments(sampleComments, 'likes', 'asc');
      expect(result.map(c => c.id)).toEqual(['2', '1', '3']);
    });

    test('should not modify original array', () => {
      const original = [...sampleComments];
      commentUtils.sortComments(sampleComments, 'likes', 'asc');
      expect(sampleComments).toEqual(original);
    });
  });
});