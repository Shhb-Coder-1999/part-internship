# Comments App Test Suite

This directory contains a comprehensive test suite for the Comments application, covering unit tests, integration tests, end-to-end tests, and performance tests.

## 🏗️ Test Structure

```
tests/
├── helpers/           # Test utilities and mock data
├── unit/             # Unit tests for individual components
├── integration/      # Integration tests for API endpoints
├── e2e/             # End-to-end workflow tests
├── performance/      # Performance and scalability tests
├── setup.js         # Global test configuration
├── runTests.js      # Test runner script
└── README.md        # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- All dependencies installed

### Running Tests

#### All Tests
```bash
# Using npm
npm test

# Using pnpm
pnpm test

# Using the test runner
node tests/runTests.js all
```

#### Specific Test Types
```bash
# Unit tests only
node tests/runTests.js unit

# Integration tests only
node tests/runTests.js integration

# End-to-end tests only
node tests/runTests.js e2e

# Performance tests only
node tests/runTests.js performance
```

#### Development Mode
```bash
# Watch mode for development
node tests/runTests.js watch

# Coverage report
node tests/runTests.js coverage
```

#### Using npm Scripts
```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

## 📋 Test Categories

### 1. Unit Tests (`tests/unit/`)

Tests individual functions and methods in isolation with mocked dependencies.

**Files:**
- `commentController.test.js` - Controller logic tests
- `commentService.test.js` - Business logic tests
- `commentValidation.test.js` - Validation middleware tests
- `databaseService.test.js` - Database operation tests
- `commentUtils.test.js` - Utility function tests

**Coverage:**
- Input validation
- Error handling
- Business logic
- Data transformation
- Edge cases

### 2. Integration Tests (`tests/integration/`)

Tests complete request-response cycles with middleware and validation.

**Files:**
- `commentRoutes.test.js` - API endpoint integration tests

**Coverage:**
- HTTP request/response handling
- Middleware integration
- Validation pipeline
- Error responses
- Content type handling

### 3. End-to-End Tests (`tests/e2e/`)

Tests complete user workflows and system integration.

**Files:**
- `commentWorkflow.test.js` - Complete comment lifecycle tests

**Coverage:**
- Comment creation to deletion workflow
- Nested comment handling
- User interaction workflows
- Error handling workflows
- Performance under load
- Data integrity

### 4. Performance Tests (`tests/performance/`)

Tests system scalability, response times, and resource usage.

**Files:**
- `commentPerformance.test.js` - Performance and scalability tests

**Coverage:**
- Response time benchmarks
- Concurrent request handling
- Large dataset processing
- Memory usage optimization
- Database query performance

## 🛠️ Test Utilities

### Helper Functions (`tests/helpers/testUtils.js`)

Provides common utilities for all tests:

- **Mock Data Generation:**
  - `generateMockComment()` - Creates mock comment objects
  - `generateMockCommentRequest()` - Creates mock request data
  - `generateMockCommentUpdateRequest()` - Creates mock update data

- **Mock Objects:**
  - `createMockRequest()` - Mock Express request
  - `createMockResponse()` - Mock Express response
  - `createMockNext()` - Mock Express next function
  - `createMockLogger()` - Mock logger

- **Database Helpers:**
  - `setupTestDatabase()` - Sets up test data
  - `cleanupTestDatabase()` - Cleans up test data
  - `createTestPrismaClient()` - Creates test database client

- **Utilities:**
  - `wait()` - Async delay function
  - `generateMockValidationErrors()` - Creates validation error objects

## ⚙️ Configuration

### Jest Configuration (`jest.config.js`)

- **Test Environment:** Node.js
- **Coverage Thresholds:** 80% for branches, functions, lines, and statements
- **Path Aliases:** Configured for `@/*` imports
- **Setup Files:** `tests/setup.js` runs before each test
- **Timeout:** 10 seconds per test
- **Coverage Reports:** Text, LCOV, and HTML formats

### Test Setup (`tests/setup.js`)

- Sets `NODE_ENV=test`
- Configures logging level
- Sets global test timeout
- Mocks console methods to reduce noise

## 📊 Test Coverage

The test suite aims for comprehensive coverage:

- **Controllers:** 100% - All CRUD operations and error handling
- **Services:** 100% - Business logic and validation
- **Middleware:** 100% - Input validation and sanitization
- **Routes:** 100% - API endpoint handling
- **Utilities:** 100% - Helper functions and data processing

## 🧪 Writing Tests

### Test Structure
```javascript
describe('Component Name - Test Category', () => {
  let mockDependencies;

  beforeEach(() => {
    // Setup mocks and test data
    mockDependencies = createMockDependencies();
  });

  describe('methodName', () => {
    it('should handle successful operation', async () => {
      // Arrange
      const input = 'test input';
      
      // Act
      const result = await method(input);
      
      // Assert
      expect(result).toBe('expected output');
    });

    it('should handle error condition', async () => {
      // Arrange
      const invalidInput = null;
      
      // Act & Assert
      await expect(method(invalidInput)).rejects.toThrow('Error message');
    });
  });
});
```

### Best Practices

1. **Descriptive Test Names:** Use clear, descriptive test names
2. **Arrange-Act-Assert:** Structure tests in three clear sections
3. **Mock Dependencies:** Mock external dependencies to isolate units
4. **Test Edge Cases:** Include boundary conditions and error scenarios
5. **Async Testing:** Use proper async/await patterns
6. **Clean Setup:** Reset mocks and state between tests

### Mocking Guidelines

- **Services:** Mock service layer for controller tests
- **Database:** Mock Prisma client for service tests
- **HTTP:** Use supertest for integration tests
- **Time:** Mock timestamps for consistent test results

## 🔍 Debugging Tests

### Running Single Tests
```bash
# Run specific test file
npx jest tests/unit/commentController.test.js

# Run specific test
npx jest -t "should create a comment successfully"

# Run tests in watch mode
npx jest --watch
```

### Debug Mode
```bash
# Run with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output
```bash
# Detailed test output
npx jest --verbose

# Show console logs
npx jest --verbose --silent=false
```

## 📈 Performance Testing

### Benchmarks
- **Response Time:** < 100ms for CRUD operations
- **Concurrent Requests:** Handle 20+ simultaneous requests
- **Large Datasets:** Process 1000+ comments efficiently
- **Memory Usage:** No memory leaks during repeated operations

### Load Testing
```bash
# Run performance tests
node tests/runTests.js performance

# Run with specific performance criteria
npx jest tests/performance/ --testNamePattern="should handle large comment lists"
```

## 🚨 Common Issues

### Test Failures
1. **Mock Not Reset:** Ensure `jest.clearAllMocks()` in `beforeEach`
2. **Async Operations:** Use proper `await` for async operations
3. **Database Connections:** Clean up database connections in `afterEach`
4. **File Paths:** Verify import paths and Jest module mapping

### Performance Issues
1. **Slow Tests:** Check for unnecessary async operations
2. **Memory Leaks:** Ensure proper cleanup in `afterEach`
3. **Database Queries:** Mock database operations for unit tests

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Add appropriate test categories
3. Update this documentation
4. Ensure coverage thresholds are met
5. Run the full test suite before submitting

## 📊 Coverage Reports

After running tests with coverage:
```bash
# View coverage in browser
open coverage/lcov-report/index.html

# View coverage summary
cat coverage/lcov-report/coverage-summary.json
```

The coverage report shows:
- Line coverage percentage
- Branch coverage percentage
- Function coverage percentage
- Statement coverage percentage
- Detailed file-by-file breakdown
