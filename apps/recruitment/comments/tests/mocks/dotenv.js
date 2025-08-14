/**
 * Mock for dotenv package
 */

import { jest } from '@jest/globals';

const dotenv = {
  config: jest.fn(() => ({ parsed: {} })),
};

export default dotenv;
