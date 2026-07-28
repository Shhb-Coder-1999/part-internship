/**
 * Integration Tests for Transaction Routes
 */

import { createFastifyServer } from '../../src/server-instance.js';
import { 
  createTestUserWithToken, 
  createTestDepositAccount, 
  createTestTransaction,
  cleanupTestData, 
  isValidUUID, 
  isValidISODate
} from '../helpers/testHelpers.js';

describe('Transaction Routes', () => {
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

  describe('GET /api/transactions', () => {
    test('should get user transactions successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);
      
      // Create test transactions
      await createTestTransaction(account.id, { type: 'DEPOSIT', amount: 1000000 });
      await createTestTransaction(account.id, { type: 'WITHDRAW', amount: 500000 });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions',
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
      
      const transaction = body.data[0];
      expect(isValidUUID(transaction.transactionId)).toBe(true);
      expect(isValidUUID(transaction.accountId)).toBe(true);
      expect(['deposit', 'withdraw']).toContain(transaction.type);
      expect(typeof transaction.amount).toBe('number');
      expect(isValidISODate(transaction.date)).toBe(true);
    });

    test('should support filtering by type', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);
      
      await createTestTransaction(account.id, { type: 'DEPOSIT' });
      await createTestTransaction(account.id, { type: 'WITHDRAW' });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions?type=deposit',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].type).toBe('deposit');
    });

    test('should support filtering by amount range', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);
      
      await createTestTransaction(account.id, { amount: 500000 });
      await createTestTransaction(account.id, { amount: 1500000 });
      await createTestTransaction(account.id, { amount: 2500000 });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions?minAmount=1000000&maxAmount=2000000',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].amount).toBe(1500000);
    });

    test('should support filtering by date range', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);
      
      const oldDate = new Date('2024-01-01');
      const recentDate = new Date();
      
      await createTestTransaction(account.id, { date: oldDate });
      await createTestTransaction(account.id, { date: recentDate });

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/transactions?startDate=${new Date('2024-06-01').toISOString()}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
    });

    test('should support pagination', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);
      
      // Create 5 transactions
      for (let i = 0; i < 5; i++) {
        await createTestTransaction(account.id);
      }

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions?page=1&pageSize=3',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(3);
      expect(body.meta).toHaveProperty('page', 1);
      expect(body.meta).toHaveProperty('pageSize', 3);
      expect(body.meta).toHaveProperty('totalItems', 5);
      expect(body.meta).toHaveProperty('totalPages', 2);
    });

    test('should return empty array for user with no transactions', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
      expect(body.meta.totalItems).toBe(0);
    });

    test('should return 422 for invalid filters', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions?type=invalid&minAmount=abc',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(422);
    });

    test('should return 401 without authentication', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/transactions/:transactionId', () => {
    test('should get specific transaction successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);
      const transaction = await createTestTransaction(account.id);

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/transactions/${transaction.id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('transactionId', transaction.id);
      expect(body.data).toHaveProperty('accountId', account.id);
    });

    test('should return 404 for non-existent transaction', async () => {
      const { token } = await createTestUserWithToken();
      const fakeTransactionId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/transactions/${fakeTransactionId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    test('should return 404 for transaction of another user', async () => {
      const { token } = await createTestUserWithToken();
      const { user: otherUser } = await createTestUserWithToken({
        phoneNumber: '09123456700'
      });
      const otherAccount = await createTestDepositAccount(otherUser.id);
      const transaction = await createTestTransaction(otherAccount.id);

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/transactions/${transaction.id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/transactions/stats', () => {
    test('should get transaction statistics successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);
      
      await createTestTransaction(account.id, { type: 'DEPOSIT', amount: 1000000 });
      await createTestTransaction(account.id, { type: 'DEPOSIT', amount: 2000000 });
      await createTestTransaction(account.id, { type: 'WITHDRAW', amount: 500000 });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions/stats',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('totalTransactions', 3);
      expect(body.data).toHaveProperty('totalDeposits', 2);
      expect(body.data).toHaveProperty('totalWithdrawals', 1);
      expect(body.data).toHaveProperty('depositAmount', 3000000);
      expect(body.data).toHaveProperty('withdrawalAmount', 500000);
    });

    test('should return zero stats for user with no transactions', async () => {
      const { token } = await createTestUserWithToken();

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions/stats',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('totalTransactions', 0);
      expect(body.data).toHaveProperty('totalDeposits', 0);
      expect(body.data).toHaveProperty('totalWithdrawals', 0);
      expect(body.data).toHaveProperty('depositAmount', 0);
      expect(body.data).toHaveProperty('withdrawalAmount', 0);
    });
  });

  describe('GET /api/transactions/recent', () => {
    test('should get recent transactions successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);
      
      // Create transactions with different timestamps
      const now = new Date();
      await createTestTransaction(account.id, { date: new Date(now - 1000) });
      await createTestTransaction(account.id, { date: new Date(now - 2000) });
      await createTestTransaction(account.id, { date: new Date(now - 3000) });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/transactions/recent?limit=2',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toHaveProperty('cardNumber');
      
      // Should be ordered by date descending
      expect(new Date(body.data[0].date) >= new Date(body.data[1].date)).toBe(true);
    });
  });

  describe('GET /api/transactions/account/:accountId', () => {
    test('should get account transactions successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);
      
      await createTestTransaction(account.id);
      await createTestTransaction(account.id);

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/transactions/account/${account.id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toHaveProperty('accountId', account.id);
    });

    test('should return 404 for non-existent account', async () => {
      const { token } = await createTestUserWithToken();
      const fakeAccountId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/transactions/account/${fakeAccountId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/transactions/account/:accountId', () => {
    test('should create transaction successfully', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id, { balance: 10000000 });

      const transactionData = {
        type: 'deposit',
        amount: 1000000
      };

      const response = await fastify.inject({
        method: 'POST',
        url: `/api/transactions/account/${account.id}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        payload: transactionData
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('type', 'deposit');
      expect(body.data).toHaveProperty('amount', 1000000);
      expect(isValidUUID(body.data.transactionId)).toBe(true);
    });

    test('should return 422 for insufficient balance on withdrawal', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id, { balance: 100000 });

      const transactionData = {
        type: 'withdraw',
        amount: 1000000
      };

      const response = await fastify.inject({
        method: 'POST',
        url: `/api/transactions/account/${account.id}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        payload: transactionData
      });

      expect(response.statusCode).toBe(422);
    });

    test('should return 422 for invalid transaction data', async () => {
      const { user, token } = await createTestUserWithToken();
      const account = await createTestDepositAccount(user.id);

      const invalidData = {
        type: 'invalid',
        amount: -1000
      };

      const response = await fastify.inject({
        method: 'POST',
        url: `/api/transactions/account/${account.id}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        payload: invalidData
      });

      expect(response.statusCode).toBe(422);
    });

    test('should return 404 for non-existent account', async () => {
      const { token } = await createTestUserWithToken();
      const fakeAccountId = '123e4567-e89b-12d3-a456-426614174000';

      const transactionData = {
        type: 'deposit',
        amount: 1000000
      };

      const response = await fastify.inject({
        method: 'POST',
        url: `/api/transactions/account/${fakeAccountId}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        payload: transactionData
      });

      expect(response.statusCode).toBe(404);
    });
  });
});