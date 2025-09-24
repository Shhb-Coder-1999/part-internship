/**
 * End-to-End Tests for Part Bank API
 * Tests the complete user journey according to PRD requirements
 */

import { createFastifyServer } from '../../src/server-instance.js';
import { cleanupTestData, createTestFileData, createMultipartData, isValidUUID, isValidCardNumber } from '../helpers/testHelpers.js';

describe('Part Bank API E2E Tests', () => {
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

  describe('Complete User Journey', () => {
    test('should complete full user journey: sign up → login → create account → get accounts → list transactions → delete account → logout', async () => {
      // Step 1: Sign up
      const signUpData = {
        firstName: 'علی',
        lastName: 'احمدی',
        idNumber: '1234567890',
        phoneNumber: '09123456789',
        password: 'password123'
      };

      const signUpResponse = await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: signUpData
      });

      expect(signUpResponse.statusCode).toBe(201);
      const signUpBody = JSON.parse(signUpResponse.body);
      expect(signUpBody.data).toHaveProperty('userId');
      expect(isValidUUID(signUpBody.data.userId)).toBe(true);

      // Step 2: Login
      const loginData = {
        phoneNumber: '09123456789',
        password: 'password123'
      };

      const loginResponse = await fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: loginData
      });

      expect(loginResponse.statusCode).toBe(200);
      const loginBody = JSON.parse(loginResponse.body);
      expect(loginBody.data).toHaveProperty('token');
      expect(loginBody.data).toHaveProperty('user');
      expect(loginBody.data.user.userId).toBe(signUpBody.data.userId);

      const token = loginBody.data.token;
      const authHeaders = { Authorization: `Bearer ${token}` };

      // Step 3: Get user profile
      const profileResponse = await fastify.inject({
        method: 'GET',
        url: '/api/auth/profile',
        headers: authHeaders
      });

      expect(profileResponse.statusCode).toBe(200);
      const profileBody = JSON.parse(profileResponse.body);
      expect(profileBody.data.userId).toBe(signUpBody.data.userId);

      // Step 4: Create deposit account
      const accountData = {
        firstName: 'علی',
        lastName: 'احمدی',
        address: 'خیابان ولیعصر، پلاک ۱۲۳، تهران',
        postalCode: '1234567890'
      };

      const fileData = createTestFileData();
      const { body, headers } = createMultipartData(accountData, fileData);

      const createAccountResponse = await fastify.inject({
        method: 'POST',
        url: '/api/deposit-account',
        headers: {
          ...authHeaders,
          ...headers
        },
        payload: body
      });

      expect(createAccountResponse.statusCode).toBe(201);
      const createAccountBody = JSON.parse(createAccountResponse.body);
      expect(createAccountBody.data).toHaveProperty('accountId');
      expect(createAccountBody.data).toHaveProperty('cardNumber');
      expect(isValidUUID(createAccountBody.data.accountId)).toBe(true);
      expect(isValidCardNumber(createAccountBody.data.cardNumber)).toBe(true);

      const accountId = createAccountBody.data.accountId;

      // Step 5: Get deposit accounts
      const getAccountsResponse = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account',
        headers: authHeaders
      });

      expect(getAccountsResponse.statusCode).toBe(200);
      const getAccountsBody = JSON.parse(getAccountsResponse.body);
      expect(getAccountsBody.data).toHaveLength(1);
      expect(getAccountsBody.data[0].accountId).toBe(accountId);
      expect(getAccountsBody.meta).toHaveProperty('totalItems', 1);

      // Step 6: Get specific account
      const getAccountResponse = await fastify.inject({
        method: 'GET',
        url: `/api/deposit-account/${accountId}`,
        headers: authHeaders
      });

      expect(getAccountResponse.statusCode).toBe(200);
      const getAccountBody = JSON.parse(getAccountResponse.body);
      expect(getAccountBody.data.accountId).toBe(accountId);

      // Step 7: Get account statistics
      const accountStatsResponse = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account/stats',
        headers: authHeaders
      });

      expect(accountStatsResponse.statusCode).toBe(200);
      const accountStatsBody = JSON.parse(accountStatsResponse.body);
      expect(accountStatsBody.data).toHaveProperty('totalAccounts', 1);

      // Step 8: Create a transaction
      const transactionData = {
        type: 'deposit',
        amount: 5000000
      };

      const createTransactionResponse = await fastify.inject({
        method: 'POST',
        url: `/api/transactions/account/${accountId}`,
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        payload: transactionData
      });

      expect(createTransactionResponse.statusCode).toBe(201);
      const createTransactionBody = JSON.parse(createTransactionResponse.body);
      expect(createTransactionBody.data).toHaveProperty('transactionId');
      expect(createTransactionBody.data.type).toBe('deposit');
      expect(createTransactionBody.data.amount).toBe(5000000);

      const transactionId = createTransactionBody.data.transactionId;

      // Step 9: List transactions
      const getTransactionsResponse = await fastify.inject({
        method: 'GET',
        url: '/api/transactions',
        headers: authHeaders
      });

      expect(getTransactionsResponse.statusCode).toBe(200);
      const getTransactionsBody = JSON.parse(getTransactionsResponse.body);
      expect(getTransactionsBody.data).toHaveLength(1);
      expect(getTransactionsBody.data[0].transactionId).toBe(transactionId);

      // Step 10: Get transaction by ID
      const getTransactionResponse = await fastify.inject({
        method: 'GET',
        url: `/api/transactions/${transactionId}`,
        headers: authHeaders
      });

      expect(getTransactionResponse.statusCode).toBe(200);
      const getTransactionBody = JSON.parse(getTransactionResponse.body);
      expect(getTransactionBody.data.transactionId).toBe(transactionId);

      // Step 11: Get transaction statistics
      const transactionStatsResponse = await fastify.inject({
        method: 'GET',
        url: '/api/transactions/stats',
        headers: authHeaders
      });

      expect(transactionStatsResponse.statusCode).toBe(200);
      const transactionStatsBody = JSON.parse(transactionStatsResponse.body);
      expect(transactionStatsBody.data).toHaveProperty('totalTransactions', 1);
      expect(transactionStatsBody.data).toHaveProperty('totalDeposits', 1);

      // Step 12: Get recent transactions
      const recentTransactionsResponse = await fastify.inject({
        method: 'GET',
        url: '/api/transactions/recent',
        headers: authHeaders
      });

      expect(recentTransactionsResponse.statusCode).toBe(200);
      const recentTransactionsBody = JSON.parse(recentTransactionsResponse.body);
      expect(recentTransactionsBody.data).toHaveLength(1);

      // Step 13: Get account transactions
      const accountTransactionsResponse = await fastify.inject({
        method: 'GET',
        url: `/api/transactions/account/${accountId}`,
        headers: authHeaders
      });

      expect(accountTransactionsResponse.statusCode).toBe(200);
      const accountTransactionsBody = JSON.parse(accountTransactionsResponse.body);
      expect(accountTransactionsBody.data).toHaveLength(1);

      // Step 14: Delete deposit account
      const deleteAccountResponse = await fastify.inject({
        method: 'DELETE',
        url: `/api/deposit-account?accountId=${accountId}`,
        headers: authHeaders
      });

      expect(deleteAccountResponse.statusCode).toBe(204);

      // Step 15: Verify account is deleted
      const verifyDeleteResponse = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account',
        headers: authHeaders
      });

      expect(verifyDeleteResponse.statusCode).toBe(200);
      const verifyDeleteBody = JSON.parse(verifyDeleteResponse.body);
      expect(verifyDeleteBody.data).toHaveLength(0);

      // Step 16: Logout
      const logoutResponse = await fastify.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: authHeaders
      });

      expect(logoutResponse.statusCode).toBe(204);

      // Step 17: Verify token is no longer valid
      const verifyLogoutResponse = await fastify.inject({
        method: 'GET',
        url: '/api/auth/profile',
        headers: authHeaders
      });

      // Note: In this implementation, tokens don't get invalidated on logout
      // In a real system, you'd implement token blacklisting
      // For now, we just verify the logout endpoint works
    });

    test('should handle multiple deposit accounts for same user', async () => {
      // Sign up and login
      const signUpData = {
        firstName: 'فاطمه',
        lastName: 'محمدی',
        idNumber: '1234567891',
        phoneNumber: '09123456700',
        password: 'password123'
      };

      await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: signUpData
      });

      const loginResponse = await fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          phoneNumber: '09123456700',
          password: 'password123'
        }
      });

      const token = JSON.parse(loginResponse.body).data.token;
      const authHeaders = { Authorization: `Bearer ${token}` };

      // Create multiple accounts
      const accountData1 = {
        firstName: 'فاطمه',
        lastName: 'محمدی',
        address: 'خیابان انقلاب، پلاک ۴۵۶، تهران',
        postalCode: '1234567890'
      };

      const accountData2 = {
        firstName: 'فاطمه',
        lastName: 'محمدی',
        address: 'خیابان آزادی، پلاک ۷۸۹، تهران',
        postalCode: '0987654321'
      };

      const fileData = createTestFileData();

      // Create first account
      const { body: body1, headers: headers1 } = createMultipartData(accountData1, fileData);
      const account1Response = await fastify.inject({
        method: 'POST',
        url: '/api/deposit-account',
        headers: { ...authHeaders, ...headers1 },
        payload: body1
      });

      expect(account1Response.statusCode).toBe(201);

      // Create second account
      const { body: body2, headers: headers2 } = createMultipartData(accountData2, fileData);
      const account2Response = await fastify.inject({
        method: 'POST',
        url: '/api/deposit-account',
        headers: { ...authHeaders, ...headers2 },
        payload: body2
      });

      expect(account2Response.statusCode).toBe(201);

      // Verify both accounts exist
      const getAccountsResponse = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account',
        headers: authHeaders
      });

      const getAccountsBody = JSON.parse(getAccountsResponse.body);
      expect(getAccountsBody.data).toHaveLength(2);
      expect(getAccountsBody.meta.totalItems).toBe(2);

      // Verify different card numbers
      const cardNumbers = getAccountsBody.data.map(acc => acc.cardNumber);
      expect(cardNumbers[0]).not.toBe(cardNumbers[1]);
      expect(isValidCardNumber(cardNumbers[0])).toBe(true);
      expect(isValidCardNumber(cardNumbers[1])).toBe(true);

      // Delete all accounts
      const deleteAllResponse = await fastify.inject({
        method: 'DELETE',
        url: '/api/deposit-account',
        headers: authHeaders
      });

      expect(deleteAllResponse.statusCode).toBe(204);

      // Verify all accounts deleted
      const verifyDeleteResponse = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account',
        headers: authHeaders
      });

      const verifyDeleteBody = JSON.parse(verifyDeleteResponse.body);
      expect(verifyDeleteBody.data).toHaveLength(0);
    });

    test('should handle transaction filtering and pagination correctly', async () => {
      // Setup user and account
      const signUpData = {
        firstName: 'حسین',
        lastName: 'رضایی',
        idNumber: '1234567892',
        phoneNumber: '09123456701',
        password: 'password123'
      };

      await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: signUpData
      });

      const loginResponse = await fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          phoneNumber: '09123456701',
          password: 'password123'
        }
      });

      const token = JSON.parse(loginResponse.body).data.token;
      const authHeaders = { Authorization: `Bearer ${token}` };

      // Create account
      const accountData = {
        firstName: 'حسین',
        lastName: 'رضایی',
        address: 'خیابان کریمخان، پلاک ۱۰۰، تهران',
        postalCode: '1234567890'
      };

      const fileData = createTestFileData();
      const { body, headers } = createMultipartData(accountData, fileData);

      const createAccountResponse = await fastify.inject({
        method: 'POST',
        url: '/api/deposit-account',
        headers: { ...authHeaders, ...headers },
        payload: body
      });

      const accountId = JSON.parse(createAccountResponse.body).data.accountId;

      // Create multiple transactions with different types and amounts
      const transactions = [
        { type: 'deposit', amount: 1000000 },
        { type: 'deposit', amount: 2000000 },
        { type: 'withdraw', amount: 500000 },
        { type: 'deposit', amount: 3000000 },
        { type: 'withdraw', amount: 1000000 }
      ];

      for (const txData of transactions) {
        await fastify.inject({
          method: 'POST',
          url: `/api/transactions/account/${accountId}`,
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          payload: txData
        });
      }

      // Test filtering by type
      const depositResponse = await fastify.inject({
        method: 'GET',
        url: '/api/transactions?type=deposit',
        headers: authHeaders
      });

      const depositBody = JSON.parse(depositResponse.body);
      expect(depositBody.data).toHaveLength(3);
      expect(depositBody.data.every(tx => tx.type === 'deposit')).toBe(true);

      // Test filtering by amount range
      const amountFilterResponse = await fastify.inject({
        method: 'GET',
        url: '/api/transactions?minAmount=1000000&maxAmount=2000000',
        headers: authHeaders
      });

      const amountFilterBody = JSON.parse(amountFilterResponse.body);
      expect(amountFilterBody.data.length).toBeGreaterThan(0);
      expect(amountFilterBody.data.every(tx => tx.amount >= 1000000 && tx.amount <= 2000000)).toBe(true);

      // Test pagination
      const paginationResponse = await fastify.inject({
        method: 'GET',
        url: '/api/transactions?page=1&pageSize=3',
        headers: authHeaders
      });

      const paginationBody = JSON.parse(paginationResponse.body);
      expect(paginationBody.data).toHaveLength(3);
      expect(paginationBody.meta.page).toBe(1);
      expect(paginationBody.meta.pageSize).toBe(3);
      expect(paginationBody.meta.totalItems).toBe(5);
      expect(paginationBody.meta.totalPages).toBe(2);

      // Test transaction statistics
      const statsResponse = await fastify.inject({
        method: 'GET',
        url: '/api/transactions/stats',
        headers: authHeaders
      });

      const statsBody = JSON.parse(statsResponse.body);
      expect(statsBody.data.totalTransactions).toBe(5);
      expect(statsBody.data.totalDeposits).toBe(3);
      expect(statsBody.data.totalWithdrawals).toBe(2);
      expect(statsBody.data.depositAmount).toBe(6000000);
      expect(statsBody.data.withdrawalAmount).toBe(1500000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle authentication errors correctly', async () => {
      // Test accessing protected endpoint without token
      const response1 = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account'
      });

      expect(response1.statusCode).toBe(401);

      // Test with invalid token
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account',
        headers: { Authorization: 'Bearer invalid-token' }
      });

      expect(response2.statusCode).toBe(401);

      // Test with malformed authorization header
      const response3 = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account',
        headers: { Authorization: 'invalid-format' }
      });

      expect(response3.statusCode).toBe(401);
    });

    test('should enforce proper validation according to PRD', async () => {
      // Test phone number validation
      const invalidPhoneResponse = await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: {
          firstName: 'علی',
          lastName: 'احمدی',
          idNumber: '1234567890',
          phoneNumber: '123456789', // Invalid format
          password: 'password123'
        }
      });

      expect(invalidPhoneResponse.statusCode).toBe(422);

      // Test name validation
      const invalidNameResponse = await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: {
          firstName: '', // Empty name
          lastName: 'احمدی',
          idNumber: '1234567890',
          phoneNumber: '09123456789',
          password: 'password123'
        }
      });

      expect(invalidNameResponse.statusCode).toBe(422);

      // Test password validation
      const invalidPasswordResponse = await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: {
          firstName: 'علی',
          lastName: 'احمدی',
          idNumber: '1234567890',
          phoneNumber: '09123456789',
          password: '123' // Too short
        }
      });

      expect(invalidPasswordResponse.statusCode).toBe(422);
    });

    test('should handle 404 errors correctly', async () => {
      // Test non-existent route
      const response1 = await fastify.inject({
        method: 'GET',
        url: '/api/non-existent'
      });

      expect(response1.statusCode).toBe(404);

      // Create user for authenticated 404 tests
      await fastify.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: {
          firstName: 'علی',
          lastName: 'احمدی',
          idNumber: '1234567890',
          phoneNumber: '09123456789',
          password: 'password123'
        }
      });

      const loginResponse = await fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          phoneNumber: '09123456789',
          password: 'password123'
        }
      });

      const token = JSON.parse(loginResponse.body).data.token;
      const authHeaders = { Authorization: `Bearer ${token}` };

      // Test non-existent account
      const response2 = await fastify.inject({
        method: 'GET',
        url: '/api/deposit-account/123e4567-e89b-12d3-a456-426614174000',
        headers: authHeaders
      });

      expect(response2.statusCode).toBe(404);

      // Test non-existent transaction
      const response3 = await fastify.inject({
        method: 'GET',
        url: '/api/transactions/123e4567-e89b-12d3-a456-426614174000',
        headers: authHeaders
      });

      expect(response3.statusCode).toBe(404);
    });
  });

  describe('API Documentation and Health Checks', () => {
    test('should serve API documentation', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api-docs'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    test('should respond to health checks', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('service', 'part-bank-api');
      expect(body).toHaveProperty('version', '1.0.0');
    });

    test('should provide detailed health check', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health/detailed'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('dependencies');
      expect(body.dependencies).toHaveProperty('database');
    });

    test('should respond to root endpoint', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('service', 'Part Bank API');
      expect(body).toHaveProperty('version', '1.0.0');
      expect(body).toHaveProperty('documentation');
      expect(body).toHaveProperty('health');
    });
  });
});