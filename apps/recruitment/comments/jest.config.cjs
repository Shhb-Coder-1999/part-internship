module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/tests/mocks/prismaClientMock.js',
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@app/shared/(.*)$': '<rootDir>/../../../packages/shared/$1',
    '^@app/shared$': '<rootDir>/../../../packages/shared/index.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true,
  globals: {
    'jest': true
  },
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  transform: {},
};
