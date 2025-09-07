/**
 * Shared Auth Module Unit Tests
 * Tests JWT service, password service, and auth utilities
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { JWTService, PasswordService, extractUserContext, requireAuth } from '../../index.js';

describe('Shared Auth Module', () => {
  describe('JWTService', () => {
    let jwtService;
    const testSecret = 'test-secret-key';

    beforeEach(() => {
      jwtService = new JWTService(testSecret);
    });

    test('should generate JWT token', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = jwtService.generateToken(payload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should verify valid JWT token', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = jwtService.generateToken(payload);
      
      const decoded = jwtService.verifyToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    test('should throw error for invalid JWT token', () => {
      expect(() => {
        jwtService.verifyToken('invalid.token.here');
      }).toThrow();
    });

    test('should generate token with custom options', () => {
      const payload = { userId: '123' };
      const options = { expiresIn: '1h' };
      
      const token = jwtService.generateToken(payload, options);
      expect(typeof token).toBe('string');
      
      const decoded = jwtService.verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
    });

    test('should create user token with proper format', () => {
      const user = {
        id: 'user123',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      const tokenData = jwtService.createUserToken(user);

      expect(tokenData).toHaveProperty('token');
      expect(tokenData).toHaveProperty('tokenType', 'Bearer');
      expect(tokenData).toHaveProperty('expiresIn');
      expect(tokenData.user).toMatchObject({
        id: user.id,
        email: user.email
      });
    });

    test('should decode token without verification', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = jwtService.generateToken(payload);
      
      const decoded = jwtService.decodeToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });
  });

  describe('PasswordService', () => {
    let passwordService;

    beforeEach(() => {
      passwordService = new PasswordService();
    });

    test('should hash password', async () => {
      const password = 'testpassword123';
      const hash = await passwordService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(typeof hash).toBe('string');
    });

    test('should verify correct password', async () => {
      const password = 'testpassword123';
      const hash = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    test('should validate password strength', () => {
      const weakPassword = '123';
      const strongPassword = 'StrongPassword123!';

      expect(passwordService.validatePasswordStrength(weakPassword)).toBe(false);
      expect(passwordService.validatePasswordStrength(strongPassword)).toBe(true);
    });

    test('should generate random password', () => {
      const password = passwordService.generateRandomPassword();
      
      expect(typeof password).toBe('string');
      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(passwordService.validatePasswordStrength(password)).toBe(true);
    });

    test('should generate different passwords each time', () => {
      const password1 = passwordService.generateRandomPassword();
      const password2 = passwordService.generateRandomPassword();
      
      expect(password1).not.toBe(password2);
    });
  });

  describe('Fastify Auth Middleware', () => {
    let mockRequest;
    let mockReply;

    beforeEach(() => {
      mockRequest = {
        headers: {},
        user: null,
        requestId: null,
        isGatewayForwarded: false,
        url: '/test',
        method: 'GET',
        ip: '127.0.0.1'
      };

      mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
    });

    describe('extractUserContext', () => {
      test('should extract user context from headers', async () => {
        mockRequest.headers = {
          'x-user-id': 'user123',
          'x-user-email': 'user@example.com',
          'x-user-roles': JSON.stringify(['user', 'admin']),
          'x-request-id': 'req123',
          'x-gateway-forwarded': 'true'
        };

        await extractUserContext(mockRequest, mockReply);

        expect(mockRequest.user).toEqual({
          id: 'user123',
          email: 'user@example.com',
          roles: ['user', 'admin']
        });
        expect(mockRequest.requestId).toBe('req123');
        expect(mockRequest.isGatewayForwarded).toBe(true);
      });

      test('should handle missing user headers', async () => {
        mockRequest.headers = {
          'x-request-id': 'req123',
          'x-gateway-forwarded': 'false'
        };

        await extractUserContext(mockRequest, mockReply);

        expect(mockRequest.user).toBe(null);
        expect(mockRequest.requestId).toBe('req123');
        expect(mockRequest.isGatewayForwarded).toBe(false);
      });

      test('should handle malformed user roles JSON', async () => {
        mockRequest.headers = {
          'x-user-id': 'user123',
          'x-user-email': 'user@example.com',
          'x-user-roles': 'invalid-json',
          'x-gateway-forwarded': 'true'
        };

        await extractUserContext(mockRequest, mockReply);

        expect(mockRequest.user.roles).toEqual([]);
      });

      test('should handle extraction errors gracefully', async () => {
        // Simulate an error during extraction
        mockRequest.headers = {
          'x-user-roles': 'definitely-not-json{'
        };

        await extractUserContext(mockRequest, mockReply);

        // Should handle the error without throwing
        expect(mockReply.status).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Failed to extract user context'
          })
        );
      });
    });

    describe('requireAuth', () => {
      test('should allow authenticated user', async () => {
        mockRequest.user = {
          id: 'user123',
          email: 'user@example.com',
          roles: ['user']
        };

        await requireAuth(mockRequest, mockReply);

        expect(mockReply.status).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });

      test('should reject request without user', async () => {
        mockRequest.user = null;

        await requireAuth(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(401);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          })
        );
      });

      test('should reject request with user but no id', async () => {
        mockRequest.user = {
          email: 'user@example.com',
          roles: ['user']
        };

        await requireAuth(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(401);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Authentication required'
          })
        );
      });
    });
  });
});