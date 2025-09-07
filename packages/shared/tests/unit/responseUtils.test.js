/**
 * Shared Response Utils Unit Tests
 * Tests response formatting and utility functions
 */

import { describe, test, expect } from '@jest/globals';
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createUserTokenResponse,
  createValidationErrorResponse,
  createNotFoundErrorResponse,
  createConflictErrorResponse,
  createRateLimitErrorResponse,
  sendResponse
} from '../../utils/response.utils.js';

describe('Response Utils', () => {
  describe('createSuccessResponse', () => {
    test('should create basic success response', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response).toMatchObject({
        success: true,
        message: expect.any(String),
        data: data
      });
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    test('should create success response with custom message', () => {
      const data = { id: '123' };
      const message = 'Custom success message';
      
      const response = createSuccessResponse(data, message);

      expect(response.success).toBe(true);
      expect(response.message).toBe(message);
      expect(response.data).toBe(data);
    });

    test('should create success response with meta data', () => {
      const data = { id: '123' };
      const meta = { version: '1.0.0', service: 'test' };
      
      const response = createSuccessResponse(data, 'Success', meta);

      expect(response).toMatchObject({
        success: true,
        data: data,
        version: '1.0.0',
        service: 'test'
      });
    });

    test('should handle null data', () => {
      const response = createSuccessResponse(null);

      expect(response.success).toBe(true);
      expect(response.data).toBe(null);
    });
  });

  describe('createErrorResponse', () => {
    test('should create basic error response', () => {
      const response = createErrorResponse();

      expect(response).toMatchObject({
        success: false,
        error: 'Internal Server Error',
        statusCode: 500
      });
      expect(response.timestamp).toBeDefined();
    });

    test('should create custom error response', () => {
      const error = 'Custom Error';
      const message = 'Custom error message';
      const statusCode = 400;
      
      const response = createErrorResponse(error, message, statusCode);

      expect(response).toMatchObject({
        success: false,
        error: error,
        message: message,
        statusCode: statusCode
      });
    });

    test('should include details when provided', () => {
      const details = { field: 'email', issue: 'invalid format' };
      
      const response = createErrorResponse('Validation Error', 'Invalid input', 400, details);

      expect(response.details).toBe(details);
    });
  });

  describe('createValidationErrorResponse', () => {
    test('should create validation error with array of errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' }
      ];
      
      const response = createValidationErrorResponse(errors);

      expect(response).toMatchObject({
        success: false,
        error: 'Validation Error',
        statusCode: 400
      });
      expect(response.details.validation).toBe(errors);
    });

    test('should create validation error with custom message', () => {
      const errors = [{ field: 'name', message: 'Required' }];
      const message = 'Custom validation message';
      
      const response = createValidationErrorResponse(errors, message);

      expect(response.message).toBe(message);
    });
  });

  describe('createPaginatedResponse', () => {
    test('should create paginated response with data', () => {
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const pagination = { page: 1, limit: 10, total: 25 };
      
      const response = createPaginatedResponse(data, pagination);

      expect(response).toMatchObject({
        success: true,
        data: data
      });
      expect(response.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3
      });
    });

    test('should calculate total pages correctly', () => {
      const data = [];
      const pagination = { page: 1, limit: 10, total: 25 };
      
      const response = createPaginatedResponse(data, pagination);

      expect(response.pagination.totalPages).toBe(3);
    });

    test('should handle pagination flags', () => {
      const data = [];
      const pagination = { 
        page: 2, 
        limit: 10, 
        total: 25, 
        hasNext: true, 
        hasPrev: true 
      };
      
      const response = createPaginatedResponse(data, pagination);

      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(true);
    });

    test('should handle edge case pagination', () => {
      const data = [];
      const pagination = { page: 1, limit: 10, total: 0 };
      
      const response = createPaginatedResponse(data, pagination);

      expect(response.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      });
    });
  });

  describe('createUserTokenResponse', () => {
    test('should create user token response', () => {
      const user = {
        id: 'user123',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['user']
      };
      
      const tokenData = {
        token: 'jwt.token.here',
        tokenType: 'Bearer',
        expiresIn: '24h',
        refreshToken: 'refresh.token.here'
      };
      
      const response = createUserTokenResponse(user, tokenData);

      expect(response).toMatchObject({
        success: true,
        token: tokenData.token,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles
        }
      });
      
      expect(response.meta).toMatchObject({
        tokenType: tokenData.tokenType,
        expiresIn: tokenData.expiresIn,
        refreshToken: tokenData.refreshToken,
        service: 'gateway-auth',
        version: '2.0.0'
      });
    });

    test('should handle user without roles', () => {
      const user = {
        id: 'user123',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User'
      };
      
      const tokenData = { token: 'jwt.token.here' };
      
      const response = createUserTokenResponse(user, tokenData);

      expect(response.data.roles).toEqual([]);
    });
  });

  describe('createNotFoundErrorResponse', () => {
    test('should create not found response with defaults', () => {
      const response = createNotFoundErrorResponse();

      expect(response).toMatchObject({
        success: false,
        error: 'Not Found',
        message: 'Resource not found',
        statusCode: 404
      });
    });

    test('should create not found response with resource name', () => {
      const response = createNotFoundErrorResponse('User');

      expect(response.message).toBe('User not found');
    });

    test('should create not found response with resource and ID', () => {
      const response = createNotFoundErrorResponse('User', '123');

      expect(response.message).toBe("User with ID '123' not found");
    });
  });

  describe('createConflictErrorResponse', () => {
    test('should create conflict response with default message', () => {
      const response = createConflictErrorResponse();

      expect(response).toMatchObject({
        success: false,
        error: 'Conflict',
        message: 'Resource already exists',
        statusCode: 409
      });
    });

    test('should create conflict response with custom message', () => {
      const message = 'Email already in use';
      const response = createConflictErrorResponse(message);

      expect(response.message).toBe(message);
    });
  });

  describe('createRateLimitErrorResponse', () => {
    test('should create rate limit response', () => {
      const response = createRateLimitErrorResponse();

      expect(response).toMatchObject({
        success: false,
        error: 'Too Many Requests',
        statusCode: 429
      });
    });

    test('should include rate limit info', () => {
      const rateLimitInfo = {
        limit: 100,
        remaining: 0,
        reset: Date.now() + 900000
      };
      
      const response = createRateLimitErrorResponse('Rate limit exceeded', rateLimitInfo);

      expect(response.details).toBe(rateLimitInfo);
    });
  });

  describe('sendResponse', () => {
    test('should call reply with correct status and response', () => {
      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      
      const response = { success: true, data: 'test' };
      
      sendResponse(mockReply, response, 201);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(response);
    });

    test('should use response status code if not provided', () => {
      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      
      const response = { success: false, statusCode: 400 };
      
      sendResponse(mockReply, response);

      expect(mockReply.status).toHaveBeenCalledWith(400);
    });

    test('should default to 200 if no status code', () => {
      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      
      const response = { success: true };
      
      sendResponse(mockReply, response);

      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Response consistency', () => {
    test('all success responses should have consistent structure', () => {
      const responses = [
        createSuccessResponse({ id: '1' }),
        createPaginatedResponse([{ id: '1' }], { page: 1, limit: 10, total: 1 }),
        createUserTokenResponse({ id: '1', email: 'test@example.com' }, { token: 'test' })
      ];

      responses.forEach(response => {
        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('timestamp');
        expect(new Date(response.timestamp)).toBeInstanceOf(Date);
      });
    });

    test('all error responses should have consistent structure', () => {
      const responses = [
        createErrorResponse(),
        createValidationErrorResponse([]),
        createNotFoundErrorResponse(),
        createConflictErrorResponse(),
        createRateLimitErrorResponse()
      ];

      responses.forEach(response => {
        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('error');
        expect(response).toHaveProperty('statusCode');
        expect(response).toHaveProperty('timestamp');
        expect(new Date(response.timestamp)).toBeInstanceOf(Date);
        expect(typeof response.statusCode).toBe('number');
        expect(response.statusCode).toBeGreaterThanOrEqual(400);
      });
    });

    test('timestamps should be ISO strings', () => {
      const response = createSuccessResponse({ test: 'data' });
      
      expect(typeof response.timestamp).toBe('string');
      expect(() => new Date(response.timestamp)).not.toThrow();
      expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
    });
  });
});