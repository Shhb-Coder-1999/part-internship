/**
 * Test Setup File
 * Runs before each test file
 */

import { jest } from '@jest/globals';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-comments';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_USER = 'test';
  process.env.DB_PASSWORD = 'test';
  process.env.DB_NAME = 'comments_test';
  
  // Increase timeout for async operations
  jest.setTimeout(30000);
});

// Global test teardown
afterAll(async () => {
  // Allow time for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Uncomment to silence logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
