/**
 * Integration Tests for Deposit Account Routes
 */

import { createFastifyServer } from '../../src/server-instance.js';
import { 
  createTestUserWithToken, 
  createTestDepositAccount, 
  cleanupTestData, 
  isValidUUID, 
  isValidISODate,
  isValidCardNumber,
  createTestFileData,
  createMultipartData
} from '../helpers/testHelpers.js';

describe('Deposit Account Routes', () => {
  let fastify;

  beforeAll(async () => {
    fastify = await createFastifyServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/deposit-account', () => {
    const validAccountData = {
      firstName: 'علی',
      lastName: 'احمدی',
      address: 'خیابان ولیعصر، پلاک ۱۲۳، تهران',
      postalCode: '1234567890'
    };

    test('should create deposit account successfully', async () => {
      const { token } = await createTestUserWithToken();
      const fileData = createTestFileData();
      const { body, headers } = createMultipartData(validAccountData, fileData);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/deposit-account',
        headers: {
          Authorization: `Bearer ${token}`,
          ...headers
        },
        payload: body
      });

      expect(response.statusCode).toBe(201);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody).toHaveProperty('data');
      
      const account = responseBody.data;
      expect(isValidUUID(account.accountId)).toBe(true);
      expect(isValidUUID(account.userId)).toBe(true);
      expect(account).toHaveProperty('firstName', 'علی');
      expect(account).toHaveProperty('lastName', 'احمدی');
      expect(account).toHaveProperty('address');
      expect(account).toHaveProperty('postalCode', '1234567890');
      expect(isValidCardNumber(account.cardNumber)).toBe(true);
      expect(account).toHaveProperty('balance');
      expect(account).toHaveProperty('score');
      expect(account.score).toHaveProperty('amount');
      expect(account.score).toHaveProperty('paymentPeriod');
      expect([12, 24, 48]).toContain(account.score.paymentPeriod);
      expect(account).toHaveProperty('upcomingInstalment');
      expect(account).toHaveProperty('document');
      expect(isValidISODate(account.createdAt)).toBe(true);
    });

    test('should return 401 without authentication', async () => {
      const fileData = createTestFileData();
      const { body, headers } = createMultipartData(validAccountData, fileData);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/deposit-account',
        headers,
        payload: body
      });

      expect(response.statusCode).toBe(401);
    });

    test('should return 400 without file', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/deposit-account',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        payload: validAccountData
      });

      expect(response.statusCode).toBe(400);
    });

    test('should return 422 for validation errors', async () => {
      const { token } = await createTestUserWithToken();
      const invalidData = {
        firstName: '',
        lastName: 'احمدی',
        address: '',
        postalCode: 'abc'
      };
      const fileData = createTestFileData();
      const { body, headers } = createMultipartData(invalidData, fileData);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/deposit-account',
        headers: {
          Authorization: `Bearer ${token}`,
          ...headers
        },
        payload: body
      });

      expect(response.statusCode).toBe(422);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody).toHaveProperty('error');
      expect(responseBody.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/deposit-account', () => {
    test('should get user accounts successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      
      // Create test accounts
      await createTestDepositAccount(user.id);
      await createTestDepositAccount(user.id);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.meta).toHaveProperty('page', 1);
      expect(body.meta).toHaveProperty('pageSize', 50);
      expect(body.meta).toHaveProperty('totalItems', 2);
      expect(body.meta).toHaveProperty('totalPages', 1);
    });

    test('should support pagination', async () => {
      const { user, token } = await createTestUserWithToken();
      
      // Create 3 test accounts
      for (let i = 0; i < 3; i++) {
        await createTestDepositAccount(user.id);
      }

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account?page=1&pageSize=2',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.meta).toHaveProperty('page', 1);
      expect(body.meta).toHaveProperty('pageSize', 2);
      expect(body.meta).toHaveProperty('totalItems', 3);
      expect(body.meta).toHaveProperty('totalPages', 2);
    });

    test('should return empty array for user with no accounts', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
      expect(body.meta.totalItems).toBe(0);
    });

    test('should return 401 without authentication', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/deposit-account/:accountId', () => {
    test('should get specific account successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/deposit-account/${account.id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('accountId', account.id);
      expect(body.data).toHaveProperty('userId', user.id);
    });

    test('should return 404 for non-existent account', async () => {
      const { token } = await createTestUserWithToken();
      const fakeAccountId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/deposit-account/${fakeAccountId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    test('should return 404 for account owned by another user', async () => {
      const { token } = await createTestUserWithToken();
      const { user: otherUser } = await createTestUserWithToken({
        phoneNumber: '09123456700'
      });
      const account = await createTestDepositAccount(otherUser.id);

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/deposit-account/${account.id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/deposit-account', () => {
    test('should delete specific account successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);

      const response = await fastify.inject({
        method: 'DELETE',
        url: `/api/deposit-account?accountId=${account.id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(204);
    });

    test('should delete all accounts when no accountId provided', async () => {
      const { user, token } = await createTestUserWithToken();
      await createTestDepositAccount(user.id);
      await createTestDepositAccount(user.id);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/deposit-account',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(204);
    });

    test('should return 404 for non-existent account', async () => {
      const { token } = await createTestUserWithToken();
      const fakeAccountId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await fastify.inject({
        method: 'DELETE',
        url: `/api/deposit-account?accountId=${fakeAccountId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    test('should return 401 without authentication', async () => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/deposit-account'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/deposit-account/stats', () => {
    test('should get account statistics successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      await createTestDepositAccount(user.id, { balance: 10000000 });
      await createTestDepositAccount(user.id, { balance: 20000000 });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account/stats',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('totalAccounts', 2);
      expect(body.data).toHaveProperty('totalBalance', 30000000);
      expect(body.data).toHaveProperty('totalScore');
    });

    test('should return zero stats for user with no accounts', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account/stats',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('totalAccounts', 0);
      expect(body.data).toHaveProperty('totalBalance', 0);
      expect(body.data).toHaveProperty('totalScore', 0);
    });
  });
});