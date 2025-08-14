import { jest } from '@jest/globals';

const jwt = {
  sign: jest.fn(() => 'mock.jwt.token'),
  verify: jest.fn(() => ({ sub: 'user-id' })),
  decode: jest.fn(() => ({ sub: 'user-id' })),
};

export default jwt;
