module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Test file patterns
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],

  // Test directory structure
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/prisma/'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/**/index.js',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test timeout
  testTimeout: 10000,

  // Maximum worker pools to prevent hanging
  maxWorkers: 1,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@app/constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@app/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@app/services/(.*)$': '<rootDir>/src/services/$1',
    '^@app/repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@app/schemas/(.*)$': '<rootDir>/src/schemas/$1',
    '^@app/clients/(.*)$': '<rootDir>/src/clients/$1',
    '^@app/controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@app/middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@app/routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@app/shared/(.*)$': '<rootDir>/../../../packages/shared/$1',
    '^@app/shared$': '<rootDir>/../../../packages/shared/index.js',
    '^@app/constants$': '<rootDir>/src/constants/index.js',
    '^@app/services$': '<rootDir>/src/services/index.js',
    '^@app/repositories$': '<rootDir>/src/repositories/index.js',
    '^@app/schemas$': '<rootDir>/src/schemas/index.js',
    '^@app/clients$': '<rootDir>/src/clients/index.js',
    '^@app/controllers$': '<rootDir>/src/controllers/index.js',
    '^@app/middleware$': '<rootDir>/src/middleware/index.js',
    '^@app/routes$': '<rootDir>/src/routes/index.js',
    '^@app/utils$': '<rootDir>/src/utils/index.js',
    '^@prisma/client$': '<rootDir>/tests/mocks/prismaClientMock.js',
    '^jsonwebtoken$': '<rootDir>/tests/mocks/jsonwebtoken.js',
    '^dotenv$': '<rootDir>/tests/mocks/dotenv.js',
  },

  // Explicit transform includes for shared directory
  transformIgnorePatterns: ['/node_modules/(?!(shared)/)'],

  // Transform configuration for ES modules
  transform: {
    '^.+\\.js$': [
      'babel-jest',
      { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] },
    ],
  },

  // Transform ignore patterns - handle shared ESM modules
  transformIgnorePatterns: ['/node_modules/(?!(shared)/)'],

  // Global variables
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },

  // Module resolution
  moduleDirectories: ['node_modules', 'src', '../../shared'],

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
};
