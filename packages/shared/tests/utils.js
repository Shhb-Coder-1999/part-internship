/**
 * Shared Test Utilities and Helpers
 */

import { jest } from '@jest/globals';

export const createMockRequest = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  ip: '127.0.0.1',
  get: jest.fn(),
  ...overrides,
});

export const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => jest.fn();

export const createMockLogger = () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
});

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
