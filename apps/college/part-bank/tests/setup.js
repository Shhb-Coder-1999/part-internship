/**
 * Jest Test Setup
 */

import { prismaClient } from '../src/clients/index.js';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test_part_bank.db';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.LOG_LEVEL = 'silent';
});

// Clean up after all tests
afterAll(async () => {
  await prismaClient.$disconnect();
});

// Clean up between test suites
afterEach(async () => {
  // Clean up database between tests
  const tables = ['Transaction', 'DepositAccount', 'User'];
  
  for (const table of tables) {
    await prismaClient[table.toLowerCase()].deleteMany({});
  }
});