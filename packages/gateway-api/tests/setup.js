import { jest } from '@jest/globals';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-jest';
  process.env.JWT_EXPIRATION = '1h';
  
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