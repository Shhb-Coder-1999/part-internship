/**
 * Performance Tests for Comment System
 * Tests scalability, response times, and resource usage
 */

import { jest } from '@jest/globals';
import { commentValidation } from '@app/middleware';
import { 
  generateMockComment,
  generateMockCommentRequest,
  wait
} from '../helpers/testUtils';

describe('Comment System - Performance Tests', () => {
  
  describe('Validation Middleware Performance', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        body: {},
        params: {},
        query: {}
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    describe('Text Validation Performance', () => {
      it('should validate short text efficiently', () => {
        const shortText = 'a'.repeat(100);
        mockReq.body = { text: shortText };

        const startTime = Date.now();
        commentValidation.validateCreateComment(mockReq, mockRes, mockNext);
        const endTime = Date.now();

        expect(mockNext).toHaveBeenCalledWith();
        expect(endTime - startTime).toBeLessThan(10); // Should validate within 10ms
      });

      it('should validate long text efficiently', () => {
        const longText = 'a'.repeat(500);
        mockReq.body = { text: longText };

        const startTime = Date.now();
        commentValidation.validateCreateComment(mockReq, mockRes, mockNext);
        const endTime = Date.now();

        expect(mockNext).toHaveBeenCalledWith();
        expect(endTime - startTime).toBeLessThan(10); // Should validate within 10ms
      });

      it('should reject invalid text efficiently', () => {
        const invalidText = 'a'.repeat(1001);
        mockReq.body = { text: invalidText };

        const startTime = Date.now();
        commentValidation.validateCreateComment(mockReq, mockRes, mockNext);
        const endTime = Date.now();

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(endTime - startTime).toBeLessThan(10); // Should reject within 10ms
      });
    });

    describe('ID Validation Performance', () => {
      it('should validate valid IDs efficiently', () => {
        mockReq.params = { id: 'valid-comment-id-123' };

        const startTime = Date.now();
        commentValidation.validateCommentId(mockReq, mockRes, mockNext);
        const endTime = Date.now();

        expect(mockNext).toHaveBeenCalledWith();
        expect(endTime - startTime).toBeLessThan(5); // Should validate within 5ms
      });

      it('should reject invalid IDs efficiently', () => {
        mockReq.params = { id: 'invalid@#$%' };

        const startTime = Date.now();
        commentValidation.validateCommentId(mockReq, mockRes, mockNext);
        const endTime = Date.now();

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(endTime - startTime).toBeLessThan(5); // Should reject within 5ms
      });
    });

    describe('Pagination Validation Performance', () => {
      it('should validate pagination efficiently', () => {
        mockReq.query = { page: '5', limit: '25' };

        const startTime = Date.now();
        commentValidation.validatePagination(mockReq, mockRes, mockNext);
        const endTime = Date.now();

        expect(mockNext).toHaveBeenCalledWith();
        expect(endTime - startTime).toBeLessThan(5); // Should validate within 5ms
      });

      it('should set defaults efficiently', () => {
        mockReq.query = {};

        const startTime = Date.now();
        commentValidation.validatePagination(mockReq, mockRes, mockNext);
        const endTime = Date.now();

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockReq.query.page).toBe('1');
        expect(mockReq.query.limit).toBe('20');
        expect(endTime - startTime).toBeLessThan(5); // Should set defaults within 5ms
      });
    });
  });

  describe('Concurrent Validation Performance', () => {
    it('should handle multiple concurrent validations efficiently', async () => {
      const concurrentValidations = 100;
      const mockRequests = Array(concurrentValidations).fill(null).map(() => ({
        body: { text: 'Valid comment text' },
        params: {},
        query: {}
      }));

      const mockResponses = Array(concurrentValidations).fill(null).map(() => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }));

      const mockNexts = Array(concurrentValidations).fill(null).map(() => jest.fn());

      const startTime = Date.now();
      
      // Run all validations concurrently
      const promises = mockRequests.map((req, index) => 
        new Promise(resolve => {
          commentValidation.validateCreateComment(req, mockResponses[index], mockNexts[index]);
          resolve();
        })
      );

      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All validations should succeed
      mockNexts.forEach(mockNext => {
        expect(mockNext).toHaveBeenCalledWith();
      });

      // Should complete efficiently
      expect(totalTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not leak memory during repeated validations', () => {
      const iterations = 1000;
      const mockReq = { body: { text: 'Valid comment' }, params: {}, query: {} };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        commentValidation.validateCreateComment(mockReq, mockRes, mockNext);
        mockNext.mockClear();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(mockNext).toHaveBeenCalledTimes(iterations);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle validation errors efficiently', () => {
      const invalidText = '';
      mockReq.body = { text: invalidText };

      const startTime = Date.now();
      commentValidation.validateCreateComment(mockReq, mockRes, mockNext);
      const endTime = Date.now();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(endTime - startTime).toBeLessThan(5); // Should handle error within 5ms
    });
  });
});
