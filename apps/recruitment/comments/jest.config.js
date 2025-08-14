module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Test directory structure
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/prisma/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/**/index.js'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@shared/(.*)$': '<rootDir>/../../shared/$1',
    '^@constants$': '<rootDir>/src/constants/index.js',
    '^@services$': '<rootDir>/src/services/index.js',
    '^@controllers$': '<rootDir>/src/controllers/index.js',
    '^@middleware$': '<rootDir>/src/middleware/index.js',
    '^@routes$': '<rootDir>/src/routes/index.js',
    '^@utils$': '<rootDir>/src/utils/index.js'
  },
  
  // Transform configuration for ES modules
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }]
  },
  
  // Transform ignore patterns - handle shared ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(@shared|@prisma)/)'
  ],
  
  // ES Module support
  extensionsToTreatAsEsm: ['.js'],
  
  // Global variables
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // ES Module support
  preset: 'default',
  
  // Module resolution
  moduleDirectories: ['node_modules', 'src', '../../shared'],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};
