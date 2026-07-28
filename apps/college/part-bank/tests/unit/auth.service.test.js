/**
 * Unit Tests for AuthService
 */

import { AuthService } from '../../src/services/index.js';
import { createTestUser, cleanupTestData } from '../helpers/testHelpers.js';
import { UnauthorizedError, ConflictError, ValidationError } from '../../../packages/shared/utils';

describe('AuthService', () => {
  let authService;

  beforeAll(() => {
    authService = AuthService;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('signUp', () => {
    const validSignUpData = {
      firstName: 'علی',
      lastName: 'احمدی',
      idNumber: '1234567890',
      phoneNumber: '09123456789',
      password: 'password123'
    };

    test('should create user with valid data', async () => {
      const result = await authService.signUp(validSignUpData);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('phoneNumber', '09123456789');
      expect(result).toHaveProperty('firstName', 'علی');
      expect(result).toHaveProperty('lastName', 'احمدی');
      expect(result).toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('passwordHash');
    });

    test('should throw ConflictError for duplicate phone number', async () => {
      await createTestUser({ phoneNumber: '09123456789' });

      await expect(authService.signUp(validSignUpData))
        .rejects.toThrow(ConflictError);
    });

    test('should throw ValidationError for invalid phone number', async () => {
      const invalidData = { ...validSignUpData, phoneNumber: '123456789' };

      await expect(authService.signUp(invalidData))
        .rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for invalid name', async () => {
      const invalidData = { ...validSignUpData, firstName: '' };

      await expect(authService.signUp(invalidData))
        .rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for invalid password', async () => {
      const invalidData = { ...validSignUpData, password: '123' };

      await expect(authService.signUp(invalidData))
        .rejects.toThrow(ValidationError);
    });

    test('should sanitize input data', async () => {
      const dataWithSpaces = {
        ...validSignUpData,
        firstName: '  علی  ',
        lastName: '  احمدی  '
      };

      const result = await authService.signUp(dataWithSpaces);
      expect(result.firstName).toBe('علی');
      expect(result.lastName).toBe('احمدی');
    });
  });

  describe('login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser({
        phoneNumber: '09123456789'
      });
    });

    test('should login with valid credentials', async () => {
      const loginData = {
        phoneNumber: '09123456789',
        password: 'password123'
      };

      const result = await authService.login(loginData);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('userId', testUser.id);
      expect(result.user).toHaveProperty('phoneNumber', '09123456789');
    });

    test('should throw UnauthorizedError for invalid phone number', async () => {
      const loginData = {
        phoneNumber: '09123456788',
        password: 'password123'
      };

      await expect(authService.login(loginData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should throw UnauthorizedError for invalid password', async () => {
      const loginData = {
        phoneNumber: '09123456789',
        password: 'wrongpassword'
      };

      await expect(authService.login(loginData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should throw UnauthorizedError for inactive user', async () => {
      await createTestUser({
        phoneNumber: '09123456700',
        status: 'DISABLED'
      });

      const loginData = {
        phoneNumber: '09123456700',
        password: 'password123'
      };

      await expect(authService.login(loginData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should throw ValidationError for invalid phone format', async () => {
      const loginData = {
        phoneNumber: '123456789',
        password: 'password123'
      };

      await expect(authService.login(loginData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getUserProfile', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    test('should return user profile', async () => {
      const result = await authService.getUserProfile(testUser.id);

      expect(result).toHaveProperty('userId', testUser.id);
      expect(result).toHaveProperty('phoneNumber', testUser.phoneNumber);
      expect(result).toHaveProperty('firstName', testUser.firstName);
      expect(result).toHaveProperty('lastName', testUser.lastName);
      expect(result).toHaveProperty('status', testUser.status);
      expect(result).not.toHaveProperty('passwordHash');
    });

    test('should throw UnauthorizedError for non-existent user', async () => {
      const fakeUserId = 'non-existent-id';

      await expect(authService.getUserProfile(fakeUserId))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    test('should logout successfully', async () => {
      const result = await authService.logout('fake-token');
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('validateSignUpData', () => {
    test('should validate correct data', () => {
      const validData = {
        firstName: 'علی',
        lastName: 'احمدی',
        idNumber: '1234567890',
        phoneNumber: '09123456789',
        password: 'password123'
      };

      const result = authService.validateSignUpData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return errors for invalid data', () => {
      const invalidData = {
        firstName: '',
        lastName: '123',
        idNumber: 'abc',
        phoneNumber: '123',
        password: '12'
      };

      const result = authService.validateSignUpData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateLoginData', () => {
    test('should validate correct login data', () => {
      const validData = {
        phoneNumber: '09123456789',
        password: 'password123'
      };

      const result = authService.validateLoginData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return errors for invalid login data', () => {
      const invalidData = {
        phoneNumber: '123',
        password: ''
      };

      const result = authService.validateLoginData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});