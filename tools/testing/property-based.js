/**
 * Property-Based Testing Utilities
 * Using @fast-check/jest for property-based testing
 */

import fc from 'fast-check';

/**
 * Common generators for API testing
 */
export const generators = {
  // Basic types
  nonEmptyString: () => fc.string({ minLength: 1, maxLength: 100 }),
  email: () => fc.emailAddress(),
  uuid: () => fc.uuid(),
  positiveInt: () => fc.integer({ min: 1, max: 1000000 }),
  timestamp: () => fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  
  // API-specific generators
  httpStatus: () => fc.integer({ min: 100, max: 599 }),
  httpMethod: () => fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
  
  // Database records
  userRecord: () => fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    email: fc.emailAddress(),
    createdAt: fc.date(),
    updatedAt: fc.date()
  }),
  
  commentRecord: () => fc.record({
    id: fc.uuid(),
    content: fc.string({ minLength: 1, maxLength: 500 }),
    userId: fc.uuid(),
    createdAt: fc.date(),
    updatedAt: fc.date()
  }),
  
  // Request/Response objects
  paginationParams: () => fc.record({
    page: fc.integer({ min: 1, max: 100 }),
    limit: fc.integer({ min: 1, max: 100 }),
    sortBy: fc.constantFrom('id', 'createdAt', 'updatedAt', 'name'),
    sortOrder: fc.constantFrom('asc', 'desc')
  }),
  
  apiResponse: (dataGen) => fc.record({
    success: fc.boolean(),
    message: fc.string(),
    data: dataGen,
    timestamp: fc.date().map(d => d.toISOString())
  }),
  
  errorResponse: () => fc.record({
    success: fc.constant(false),
    error: fc.string({ minLength: 1 }),
    statusCode: fc.integer({ min: 400, max: 599 }),
    timestamp: fc.date().map(d => d.toISOString())
  })
};

/**
 * Property-based test helpers
 */
export const properties = {
  /**
   * Test that a function is idempotent
   */
  idempotent: (fn) => fc.property(
    fc.anything(),
    async (input) => {
      const result1 = await fn(input);
      const result2 = await fn(input);
      expect(result1).toEqual(result2);
    }
  ),
  
  /**
   * Test that a function handles invalid input gracefully
   */
  gracefulErrorHandling: (fn, validInputGen, invalidInputGen) => fc.property(
    invalidInputGen,
    async (invalidInput) => {
      try {
        await fn(invalidInput);
        // If no error is thrown, that's fine too
      } catch (error) {
        // Error should be well-formed
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeTruthy();
      }
    }
  ),
  
  /**
   * Test that API responses have consistent structure
   */
  consistentApiResponse: (apiCall, inputGen) => fc.property(
    inputGen,
    async (input) => {
      const response = await apiCall(input);
      
      // All API responses should have these properties
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('timestamp');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.timestamp).toBe('string');
      
      if (response.success) {
        expect(response).toHaveProperty('data');
        expect(response).toHaveProperty('message');
      } else {
        expect(response).toHaveProperty('error');
      }
    }
  ),
  
  /**
   * Test that pagination works correctly
   */
  validPagination: (paginatedCall) => fc.property(
    generators.paginationParams(),
    async (params) => {
      const response = await paginatedCall(params);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.pagination).toBeDefined();
      
      const { pagination } = response;
      expect(pagination.page).toBe(params.page);
      expect(pagination.limit).toBe(params.limit);
      expect(pagination.total).toBeGreaterThanOrEqual(0);
      expect(pagination.totalPages).toBeGreaterThanOrEqual(0);
      
      // Data length should not exceed limit
      if (Array.isArray(response.data)) {
        expect(response.data.length).toBeLessThanOrEqual(params.limit);
      }
    }
  ),
  
  /**
   * Test that sorting works correctly
   */
  validSorting: (sortableCall, dataExtractor = (r) => r.data) => fc.property(
    generators.paginationParams(),
    async (params) => {
      const response = await sortableCall(params);
      const data = dataExtractor(response);
      
      if (Array.isArray(data) && data.length > 1) {
        const sortField = params.sortBy;
        const isAscending = params.sortOrder === 'asc';
        
        for (let i = 0; i < data.length - 1; i++) {
          const current = data[i][sortField];
          const next = data[i + 1][sortField];
          
          if (isAscending) {
            expect(current <= next).toBe(true);
          } else {
            expect(current >= next).toBe(true);
          }
        }
      }
    }
  )
};

/**
 * Test data factories for consistent test data generation
 */
export const factories = {
  /**
   * Create a user factory
   */
  createUser: (overrides = {}) => ({
    ...fc.sample(generators.userRecord(), 1)[0],
    ...overrides
  }),
  
  /**
   * Create multiple users
   */
  createUsers: (count = 5, overrides = {}) =>
    Array.from({ length: count }, () => factories.createUser(overrides)),
  
  /**
   * Create a comment factory
   */
  createComment: (overrides = {}) => ({
    ...fc.sample(generators.commentRecord(), 1)[0],
    ...overrides
  }),
  
  /**
   * Create multiple comments
   */
  createComments: (count = 5, overrides = {}) =>
    Array.from({ length: count }, () => factories.createComment(overrides)),
  
  /**
   * Create API request data
   */
  createApiRequest: (method = 'GET', overrides = {}) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    timestamp: new Date().toISOString(),
    ...overrides
  })
};

/**
 * Property-based test runner
 */
export class PropertyBasedTestRunner {
  constructor(options = {}) {
    this.options = {
      numRuns: 100,
      timeout: 5000,
      ...options
    };
  }
  
  /**
   * Run a property test
   */
  async runProperty(property, description) {
    console.log(`🧪 Running property test: ${description}`);
    
    try {
      await fc.assert(property, {
        numRuns: this.options.numRuns,
        timeout: this.options.timeout
      });
      console.log(`✅ Property test passed: ${description}`);
    } catch (error) {
      console.error(`❌ Property test failed: ${description}`, error);
      throw error;
    }
  }
  
  /**
   * Run multiple property tests
   */
  async runProperties(propertyTests) {
    const results = [];
    
    for (const { property, description } of propertyTests) {
      try {
        await this.runProperty(property, description);
        results.push({ description, status: 'passed' });
      } catch (error) {
        results.push({ description, status: 'failed', error: error.message });
      }
    }
    
    return results;
  }
}

export default {
  generators,
  properties,
  factories,
  PropertyBasedTestRunner
};
