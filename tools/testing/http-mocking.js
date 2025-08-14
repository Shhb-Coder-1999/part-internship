/**
 * HTTP Mocking Utilities
 * Using nock for HTTP request mocking
 */

import nock from 'nock';

/**
 * HTTP Mock Manager
 * Provides utilities for managing HTTP mocks in tests
 */
export class HttpMockManager {
  constructor() {
    this.mocks = new Map();
    this.activeMocks = [];
  }
  
  /**
   * Create a mock for an external API
   * @param {string} baseUrl - Base URL to mock
   * @param {string} name - Name for the mock (for tracking)
   * @returns {Object} Nock interceptor
   */
  createMock(baseUrl, name = 'default') {
    const mock = nock(baseUrl);
    this.mocks.set(name, mock);
    this.activeMocks.push(mock);
    return mock;
  }
  
  /**
   * Get a mock by name
   * @param {string} name - Mock name
   * @returns {Object} Nock interceptor
   */
  getMock(name) {
    return this.mocks.get(name);
  }
  
  /**
   * Clean up all mocks
   */
  cleanAll() {
    nock.cleanAll();
    this.mocks.clear();
    this.activeMocks.length = 0;
  }
  
  /**
   * Restore all mocks
   */
  restore() {
    nock.restore();
  }
  
  /**
   * Check if all mocks have been used
   * @returns {boolean} True if all mocks are done
   */
  allMocksDone() {
    return this.activeMocks.every(mock => mock.isDone());
  }
  
  /**
   * Get pending mocks (not yet called)
   * @returns {Array} Array of pending mock descriptions
   */
  getPendingMocks() {
    return this.activeMocks
      .filter(mock => !mock.isDone())
      .map(mock => mock.pendingMocks())
      .flat();
  }
}

/**
 * Common mock patterns for APIs
 */
export const mockPatterns = {
  /**
   * Mock successful API response
   */
  successResponse: (data, statusCode = 200) => ({
    success: true,
    message: 'Success',
    data,
    timestamp: new Date().toISOString()
  }),
  
  /**
   * Mock error API response
   */
  errorResponse: (error, statusCode = 400) => ({
    success: false,
    error: typeof error === 'string' ? error : error.message,
    statusCode,
    timestamp: new Date().toISOString()
  }),
  
  /**
   * Mock paginated response
   */
  paginatedResponse: (items, page = 1, limit = 10, total = null) => ({
    success: true,
    message: 'Success',
    data: items,
    pagination: {
      page,
      limit,
      total: total || items.length,
      totalPages: Math.ceil((total || items.length) / limit)
    },
    timestamp: new Date().toISOString()
  }),
  
  /**
   * Mock authentication response
   */
  authResponse: (user, token) => ({
    success: true,
    message: 'Authentication successful',
    data: {
      user,
      token,
      expiresIn: '24h'
    },
    timestamp: new Date().toISOString()
  })
};

/**
 * Pre-configured mock scenarios
 */
export const mockScenarios = {
  /**
   * Mock external user service
   */
  userService: (mockManager, baseUrl = 'https://user-service.api') => {
    const mock = mockManager.createMock(baseUrl, 'userService');
    
    // Get user by ID
    mock
      .get(/\/api\/users\/\w+/)
      .reply(200, mockPatterns.successResponse({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date().toISOString()
      }));
    
    // Get users list
    mock
      .get('/api/users')
      .query(true)
      .reply(200, mockPatterns.paginatedResponse([
        { id: '1', name: 'User 1', email: 'user1@example.com' },
        { id: '2', name: 'User 2', email: 'user2@example.com' }
      ]));
    
    // Create user
    mock
      .post('/api/users')
      .reply(201, (uri, requestBody) => {
        const userData = JSON.parse(requestBody);
        return mockPatterns.successResponse({
          id: 'new-user-id',
          ...userData,
          createdAt: new Date().toISOString()
        });
      });
    
    // User not found
    mock
      .get('/api/users/not-found')
      .reply(404, mockPatterns.errorResponse('User not found', 404));
    
    return mock;
  },
  
  /**
   * Mock external notification service
   */
  notificationService: (mockManager, baseUrl = 'https://notification-service.api') => {
    const mock = mockManager.createMock(baseUrl, 'notificationService');
    
    // Send notification
    mock
      .post('/api/notifications')
      .reply(200, mockPatterns.successResponse({
        id: 'notification-id',
        status: 'sent',
        sentAt: new Date().toISOString()
      }));
    
    // Service unavailable
    mock
      .post('/api/notifications/critical')
      .reply(503, mockPatterns.errorResponse('Service temporarily unavailable', 503));
    
    return mock;
  },
  
  /**
   * Mock authentication service
   */
  authService: (mockManager, baseUrl = 'https://auth-service.api') => {
    const mock = mockManager.createMock(baseUrl, 'authService');
    
    // Valid login
    mock
      .post('/api/auth/login')
      .reply(200, (uri, requestBody) => {
        const { email, password } = JSON.parse(requestBody);
        
        if (email === 'test@example.com' && password === 'password') {
          return mockPatterns.authResponse(
            { id: '1', email, name: 'Test User' },
            'mock-jwt-token'
          );
        }
        
        return mockPatterns.errorResponse('Invalid credentials', 401);
      });
    
    // Token validation
    mock
      .get('/api/auth/validate')
      .matchHeader('authorization', /Bearer .+/)
      .reply(200, mockPatterns.successResponse({
        valid: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' }
      }));
    
    // Invalid token
    mock
      .get('/api/auth/validate')
      .reply(401, mockPatterns.errorResponse('Invalid token', 401));
    
    return mock;
  }
};

/**
 * Mock utilities for testing
 */
export const mockUtils = {
  /**
   * Mock network delay
   */
  withDelay: (mock, delay = 100) => {
    return mock.delay(delay);
  },
  
  /**
   * Mock intermittent failures
   */
  withIntermittentFailure: (mock, failureRate = 0.1) => {
    return mock.reply(() => {
      if (Math.random() < failureRate) {
        return [503, mockPatterns.errorResponse('Service temporarily unavailable', 503)];
      }
      return [200, mockPatterns.successResponse({ success: true })];
    });
  },
  
  /**
   * Mock rate limiting
   */
  withRateLimit: (mock, limit = 5) => {
    let callCount = 0;
    
    return mock.reply(() => {
      callCount++;
      if (callCount > limit) {
        return [429, mockPatterns.errorResponse('Rate limit exceeded', 429)];
      }
      return [200, mockPatterns.successResponse({ callCount })];
    });
  },
  
  /**
   * Mock circuit breaker behavior
   */
  withCircuitBreaker: (mock, failureThreshold = 3) => {
    let failures = 0;
    let circuitOpen = false;
    
    return mock.reply(() => {
      if (circuitOpen) {
        return [503, mockPatterns.errorResponse('Circuit breaker open', 503)];
      }
      
      // Simulate random failures
      if (Math.random() < 0.3) {
        failures++;
        if (failures >= failureThreshold) {
          circuitOpen = true;
        }
        return [500, mockPatterns.errorResponse('Service error', 500)];
      }
      
      failures = 0;
      return [200, mockPatterns.successResponse({ status: 'ok' })];
    });
  }
};

/**
 * Test helper for setting up common mocks
 */
export function setupCommonMocks() {
  const mockManager = new HttpMockManager();
  
  // Set up common external services
  mockScenarios.userService(mockManager);
  mockScenarios.authService(mockManager);
  mockScenarios.notificationService(mockManager);
  
  return mockManager;
}

/**
 * Jest setup for HTTP mocking
 */
export function setupJestMocking() {
  beforeEach(() => {
    // Disable net connections except for localhost
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });
  
  afterEach(() => {
    // Clean up all mocks after each test
    nock.cleanAll();
  });
  
  afterAll(() => {
    // Restore all mocks after all tests
    nock.restore();
  });
}

export default {
  HttpMockManager,
  mockPatterns,
  mockScenarios,
  mockUtils,
  setupCommonMocks,
  setupJestMocking
};
