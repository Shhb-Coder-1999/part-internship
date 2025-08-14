/**
 * Test Utilities and Helpers
 * Common functions used across all tests
 */

import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';

/**
 * Create a test Prisma client
 */
export const createTestPrismaClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: 'file:./test.db'
      }
    }
  });
};

/**
 * Generate mock comment data
 */
export const generateMockComment = (overrides = {}) => ({
  id: 'test-comment-id',
  text: 'This is a test comment',
  userId: 'test-user-id',
  likes: 0,
  dislikes: 0,
  parentId: null,
  isDeleted: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides
});

/**
 * Generate mock user data
 */
export const generateMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides
});

/**
 * Generate mock comment creation request
 */
export const generateMockCommentRequest = (overrides = {}) => ({
  text: 'This is a test comment',
  parentId: null,
  ...overrides
});

/**
 * Generate mock comment update request
 */
export const generateMockCommentUpdateRequest = (overrides = {}) => ({
  text: 'This is an updated test comment',
  ...overrides
});

/**
 * Generate mock validation errors
 */
export const generateMockValidationErrors = (field = 'text', message = 'Field is required') => [
  {
    field,
    message
  }
];

/**
 * Mock Express request object
 */
export const createMockRequest = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  ip: '127.0.0.1',
  get: jest.fn(),
  ...overrides
});

/**
 * Mock Express response object
 */
export const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Mock Express next function
 */
export const createMockNext = () => jest.fn();

/**
 * Clean up test database
 */
export const cleanupTestDatabase = async (prisma) => {
  try {
    await prisma.comment.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
};

/**
 * Setup test database with sample data
 */
export const setupTestDatabase = async (prisma) => {
  try {
    // Create test user
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    // Create test comments
    const comment1 = await prisma.comment.create({
      data: {
        text: 'Test comment 1',
        userId: user.id
      }
    });

    const comment2 = await prisma.comment.create({
      data: {
        text: 'Test comment 2',
        userId: user.id,
        parentId: comment1.id
      }
    });

    return { user, comment1, comment2 };
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

/**
 * Wait for async operations
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock logger for testing
 */
export const createMockLogger = () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn()
});
