/**
 * Gateway Authentication Unit Tests
 * Tests authentication middleware and JWT functionality
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createAuthMiddleware } from '../../src/middleware/auth.middleware.js';

// Mock Fastify instance
const mockFastify = {
  jwt: {
    verify: jest.fn()
  },
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  },
  decorate: jest.fn()
};

// Mock request and reply
const mockRequest = {
  headers: {},
  user: null,
  url: '/test',
  log: {
    error: jest.fn()
  }
};

const mockReply = {
  status: jest.fn().mockReturnThis(),
  send: jest.fn()
};

describe('Gateway Authentication Middleware', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockRequest.headers = {};
    mockRequest.user = null;
    mockRequest.url = '/test';
    
    // Setup default mock behavior
    createAuthMiddleware(mockFastify);
  });

  describe('authenticate decorator', () => {
    test('should skip authentication for health check routes', async () => {
      mockRequest.url = '/health';
      
      const authenticate = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authenticate'
      )[1];
      
      await authenticate.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    test('should skip authentication for root route', async () => {
      mockRequest.url = '/';
      
      const authenticate = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authenticate'
      )[1];
      
      await authenticate.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    test('should skip authentication for api-docs routes', async () => {
      mockRequest.url = '/api-docs';
      
      const authenticate = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authenticate'
      )[1];
      
      await authenticate.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    test('should return 401 if no authorization header', async () => {
      mockRequest.url = '/api/protected';
      
      const authenticate = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authenticate'
      )[1];
      
      await authenticate.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authorization header missing or invalid'
        })
      );
    });

    test('should return 401 if authorization header does not start with Bearer', async () => {
      mockRequest.url = '/api/protected';
      mockRequest.headers.authorization = 'Basic some-token';
      
      const authenticate = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authenticate'
      )[1];
      
      await authenticate.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authorization header missing or invalid'
        })
      );
    });

    test('should verify JWT token and set user on request', async () => {
      mockRequest.url = '/api/protected';
      mockRequest.headers.authorization = 'Bearer valid-token';
      
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        isActive: true,
        roles: [
          { role: { name: 'user' } }
        ]
      };
      
      mockFastify.jwt.verify.mockReturnValue({ id: 'user123' });
      mockFastify.prisma.user.findUnique.mockResolvedValue(mockUser);
      
      const authenticate = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authenticate'
      )[1];
      
      await authenticate.call(mockFastify, mockRequest, mockReply);
      
      expect(mockFastify.jwt.verify).toHaveBeenCalledWith('valid-token');
      expect(mockFastify.prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });
      
      expect(mockRequest.user).toEqual(
        expect.objectContaining({
          id: 'user123',
          email: 'user@example.com',
          roles: ['user']
        })
      );
      
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    test('should return 401 if JWT verification fails', async () => {
      mockRequest.url = '/api/protected';
      mockRequest.headers.authorization = 'Bearer invalid-token';
      
      mockFastify.jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const authenticate = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authenticate'
      )[1];
      
      await authenticate.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid token'
        })
      );
    });

    test('should return 401 if user not found in database', async () => {
      mockRequest.url = '/api/protected';
      mockRequest.headers.authorization = 'Bearer valid-token';
      
      mockFastify.jwt.verify.mockReturnValue({ id: 'user123' });
      mockFastify.prisma.user.findUnique.mockResolvedValue(null);
      
      const authenticate = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authenticate'
      )[1];
      
      await authenticate.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'User not found or inactive'
        })
      );
    });

    test('should return 401 if user is not active', async () => {
      mockRequest.url = '/api/protected';
      mockRequest.headers.authorization = 'Bearer valid-token';
      
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        isActive: false,
        roles: []
      };
      
      mockFastify.jwt.verify.mockReturnValue({ id: 'user123' });
      mockFastify.prisma.user.findUnique.mockResolvedValue(mockUser);
      
      const authenticate = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authenticate'
      )[1];
      
      await authenticate.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'User not found or inactive'
        })
      );
    });
  });

  describe('requireAdmin decorator', () => {
    test('should allow access if user has admin role', async () => {
      mockRequest.user = {
        id: 'admin123',
        roles: ['admin', 'user']
      };
      
      const requireAdmin = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'requireAdmin'
      )[1];
      
      await requireAdmin.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    test('should return 403 if user has no roles', async () => {
      mockRequest.user = {
        id: 'user123',
        roles: null
      };
      
      const requireAdmin = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'requireAdmin'
      )[1];
      
      await requireAdmin.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Admin access required'
        })
      );
    });

    test('should return 403 if user is not admin', async () => {
      mockRequest.user = {
        id: 'user123',
        roles: ['user']
      };
      
      const requireAdmin = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'requireAdmin'
      )[1];
      
      await requireAdmin.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Admin access required'
        })
      );
    });

    test('should return 403 if no user', async () => {
      mockRequest.user = null;
      
      const requireAdmin = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'requireAdmin'
      )[1];
      
      await requireAdmin.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Admin access required'
        })
      );
    });
  });

  describe('authorize decorator', () => {
    test('should allow access if user has required role', async () => {
      mockRequest.user = {
        id: 'user123',
        roles: ['user', 'moderator']
      };
      
      const authorize = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authorize'
      )[1];
      
      const authMiddleware = authorize(['moderator']);
      await authMiddleware.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    test('should allow access if user has one of multiple required roles', async () => {
      mockRequest.user = {
        id: 'user123',
        roles: ['user']
      };
      
      const authorize = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authorize'
      )[1];
      
      const authMiddleware = authorize(['admin', 'user']);
      await authMiddleware.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    test('should return 403 if user has no required roles', async () => {
      mockRequest.user = {
        id: 'user123',
        roles: ['guest']
      };
      
      const authorize = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authorize'
      )[1];
      
      const authMiddleware = authorize(['admin', 'moderator']);
      await authMiddleware.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied. Required roles: admin, moderator'
        })
      );
    });

    test('should return 403 if no user', async () => {
      mockRequest.user = null;
      
      const authorize = mockFastify.decorate.mock.calls.find(
        call => call[0] === 'authorize'
      )[1];
      
      const authMiddleware = authorize(['user']);
      await authMiddleware.call(mockFastify, mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required'
        })
      );
    });
  });
});