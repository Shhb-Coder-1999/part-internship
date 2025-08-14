/**
 * Enhanced Testing Setup
 * Comprehensive testing utilities and configuration
 */

import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import performance from './performance.js';
import propertyBased from './property-based.js';
import httpMocking from './http-mocking.js';

// Ensure test results directory exists
const testResultsDir = join(process.cwd(), 'test-results');
if (!existsSync(testResultsDir)) {
  mkdirSync(testResultsDir, { recursive: true });
}

/**
 * Test environment setup
 */
export class TestEnvironment {
  constructor(options = {}) {
    this.options = {
      enablePerformanceTesting: true,
      enablePropertyBasedTesting: true,
      enableHttpMocking: true,
      ...options
    };
    
    this.mockManager = null;
    this.performanceResults = [];
    this.propertyTestResults = [];
  }
  
  /**
   * Setup test environment
   */
  async setup() {
    console.log('🔧 Setting up enhanced test environment...');
    
    // Setup HTTP mocking
    if (this.options.enableHttpMocking) {
      this.mockManager = httpMocking.setupCommonMocks();
      httpMocking.setupJestMocking();
      console.log('✅ HTTP mocking enabled');
    }
    
    // Setup performance testing
    if (this.options.enablePerformanceTesting) {
      console.log('✅ Performance testing enabled');
    }
    
    // Setup property-based testing
    if (this.options.enablePropertyBasedTesting) {
      console.log('✅ Property-based testing enabled');
    }
    
    console.log('🚀 Test environment ready!');
  }
  
  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    if (this.mockManager) {
      this.mockManager.cleanAll();
    }
    
    console.log('✅ Test environment cleaned up');
  }
  
  /**
   * Run performance benchmarks
   */
  async runPerformanceBenchmarks(serviceUrl, serviceName) {
    if (!this.options.enablePerformanceTesting) {
      console.log('⏭️  Performance testing disabled');
      return;
    }
    
    console.log(`🚀 Running performance benchmarks for ${serviceName}...`);
    
    const endpoints = performance.generateBenchmarkConfig(serviceName);
    const results = await performance.runApiPerformanceTests(serviceUrl, endpoints);
    
    this.performanceResults.push({
      service: serviceName,
      timestamp: new Date().toISOString(),
      results
    });
    
    // Save results
    performance.savePerformanceResults(
      this.performanceResults,
      `performance-${serviceName}-${Date.now()}.json`
    );
    
    return results;
  }
  
  /**
   * Run property-based tests
   */
  async runPropertyTests(propertyTests) {
    if (!this.options.enablePropertyBasedTesting) {
      console.log('⏭️  Property-based testing disabled');
      return;
    }
    
    console.log('🧪 Running property-based tests...');
    
    const runner = new propertyBased.PropertyBasedTestRunner();
    const results = await runner.runProperties(propertyTests);
    
    this.propertyTestResults.push({
      timestamp: new Date().toISOString(),
      results
    });
    
    return results;
  }
  
  /**
   * Generate test report
   */
  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.options,
      performance: this.performanceResults,
      propertyTests: this.propertyTestResults,
      summary: {
        totalPerformanceTests: this.performanceResults.length,
        totalPropertyTests: this.propertyTestResults.length,
        status: 'completed'
      }
    };
    
    return report;
  }
}

/**
 * Test data builders
 */
export const testDataBuilders = {
  /**
   * Build test API request
   */
  apiRequest: (overrides = {}) => ({
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    timestamp: new Date().toISOString(),
    ...overrides
  }),
  
  /**
   * Build test database record
   */
  dbRecord: (table, overrides = {}) => ({
    id: `test-${table}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }),
  
  /**
   * Build test user
   */
  user: (overrides = {}) => testDataBuilders.dbRecord('user', {
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  }),
  
  /**
   * Build test comment
   */
  comment: (overrides = {}) => testDataBuilders.dbRecord('comment', {
    content: 'Test comment content',
    userId: 'test-user-id',
    ...overrides
  })
};

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Wait for condition to be met
   */
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  /**
   * Retry operation with backoff
   */
  retry: async (operation, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  },
  
  /**
   * Create test timeout
   */
  timeout: (ms = 5000) => new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Test timed out after ${ms}ms`)), ms)
  ),
  
  /**
   * Measure execution time
   */
  measureTime: async (operation) => {
    const start = process.hrtime.bigint();
    const result = await operation();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    return { result, duration };
  },
  
  /**
   * Deep freeze object for immutable test data
   */
  deepFreeze: (obj) => {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
      if (obj[prop] !== null && typeof obj[prop] === 'object') {
        testUtils.deepFreeze(obj[prop]);
      }
    });
    return obj;
  }
};

/**
 * Test assertions helpers
 */
export const testAssertions = {
  /**
   * Assert API response structure
   */
  assertApiResponse: (response, expectedData = null) => {
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('timestamp');
    expect(typeof response.success).toBe('boolean');
    expect(typeof response.timestamp).toBe('string');
    
    if (response.success) {
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('message');
      if (expectedData) {
        expect(response.data).toEqual(expectedData);
      }
    } else {
      expect(response).toHaveProperty('error');
      expect(typeof response.error).toBe('string');
    }
  },
  
  /**
   * Assert pagination structure
   */
  assertPagination: (pagination, expectedPage, expectedLimit) => {
    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('totalPages');
    
    expect(pagination.page).toBe(expectedPage);
    expect(pagination.limit).toBe(expectedLimit);
    expect(pagination.total).toBeGreaterThanOrEqual(0);
    expect(pagination.totalPages).toBeGreaterThanOrEqual(0);
  },
  
  /**
   * Assert database record structure
   */
  assertDbRecord: (record, expectedFields = []) => {
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('createdAt');
    expect(record).toHaveProperty('updatedAt');
    
    expectedFields.forEach(field => {
      expect(record).toHaveProperty(field);
    });
    
    expect(typeof record.id).toBe('string');
    expect(record.id).toBeTruthy();
    expect(new Date(record.createdAt)).toBeInstanceOf(Date);
    expect(new Date(record.updatedAt)).toBeInstanceOf(Date);
  },
  
  /**
   * Assert performance metrics
   */
  assertPerformance: (metrics, thresholds = {}) => {
    const defaults = {
      maxResponseTime: 1000,
      minRequestsPerSecond: 10,
      maxErrorRate: 0.01
    };
    
    const { maxResponseTime, minRequestsPerSecond, maxErrorRate } = { ...defaults, ...thresholds };
    
    expect(metrics.latency.average).toBeLessThan(maxResponseTime);
    expect(metrics.throughput.requestsPerSecond).toBeGreaterThan(minRequestsPerSecond);
    
    const errorRate = metrics.errors / metrics.throughput.totalRequests;
    expect(errorRate).toBeLessThan(maxErrorRate);
  }
};

// Export main testing modules
export { performance, propertyBased, httpMocking };

export default {
  TestEnvironment,
  testDataBuilders,
  testUtils,
  testAssertions,
  performance,
  propertyBased,
  httpMocking
};
