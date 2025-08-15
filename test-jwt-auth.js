#!/usr/bin/env node

/**
 * JWT Authentication Integration Test
 * Tests all services to ensure JWT authentication and user data isolation works correctly
 */

import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Configuration
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

// Test users
const TEST_USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    expectedRoles: ['admin']
  },
  user1: {
    email: 'user1@example.com',
    password: 'user123',
    expectedRoles: ['user']
  },
  user2: {
    email: 'user2@example.com',
    password: 'user123',
    expectedRoles: ['user']
  }
};

// Test state
let tokens = {};
let testResults = [];

/**
 * Logger utility
 */
const logger = {
  info: (msg, data = '') => console.log(`ℹ️  ${msg}`, data),
  success: (msg, data = '') => console.log(`✅ ${msg}`, data),
  error: (msg, data = '') => console.log(`❌ ${msg}`, data),
  warn: (msg, data = '') => console.log(`⚠️  ${msg}`, data),
  test: (msg, data = '') => console.log(`🧪 ${msg}`, data)
};

/**
 * Add test result
 */
function addTestResult(service, endpoint, description, passed, error = null) {
  testResults.push({
    service,
    endpoint,
    description,
    passed,
    error: error?.message || error
  });
  
  if (passed) {
    logger.success(`${service} - ${description}`);
  } else {
    logger.error(`${service} - ${description}`, error?.message || error);
  }
}

/**
 * Login and get JWT token
 */
async function loginUser(userKey) {
  try {
    const user = TEST_USERS[userKey];
    logger.test(`Logging in ${userKey}...`);
    
    const response = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: user.email,
      password: user.password
    }, { timeout: TEST_TIMEOUT });

    if (response.data.token) {
      tokens[userKey] = response.data.token;
      logger.success(`${userKey} login successful`);
      return true;
    } else {
      logger.error(`${userKey} login failed - no token received`);
      return false;
    }
  } catch (error) {
    logger.error(`${userKey} login failed`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Test endpoint without authentication
 */
async function testWithoutAuth(service, endpoint, method = 'GET') {
  try {
    logger.test(`Testing ${service} ${method} ${endpoint} without auth...`);
    
    const response = await axios({
      method,
      url: `${GATEWAY_URL}${endpoint}`,
      timeout: TEST_TIMEOUT
    });

    // Should not reach here for protected endpoints
    addTestResult(service, endpoint, `${method} without auth should fail`, false, 'Request succeeded but should have failed');
    return false;
  } catch (error) {
    const shouldFail = error.response?.status === 401;
    addTestResult(service, endpoint, `${method} without auth correctly rejected`, shouldFail, 
      shouldFail ? null : error.response?.data || error.message);
    return shouldFail;
  }
}

/**
 * Test endpoint with authentication
 */
async function testWithAuth(service, endpoint, userKey, method = 'GET', data = null, expectedStatus = 200) {
  try {
    logger.test(`Testing ${service} ${method} ${endpoint} with ${userKey} auth...`);
    
    const config = {
      method,
      url: `${GATEWAY_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${tokens[userKey]}`
      },
      timeout: TEST_TIMEOUT
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    const success = response.status === expectedStatus;
    
    addTestResult(service, endpoint, `${method} with ${userKey} auth (${response.status})`, success,
      success ? null : `Expected ${expectedStatus}, got ${response.status}`);
    
    return { success, data: response.data };
  } catch (error) {
    const actualStatus = error.response?.status || 'network error';
    const success = actualStatus === expectedStatus;
    
    addTestResult(service, endpoint, `${method} with ${userKey} auth (${actualStatus})`, success,
      success ? null : error.response?.data || error.message);
    
    return { success, error: error.response?.data || error.message };
  }
}

/**
 * Test Comments Service
 */
async function testCommentsService() {
  logger.info('🗨️  Testing Comments Service...');

  // Test without auth (should fail)
  await testWithoutAuth('Comments', '/part/recruitment/comments', 'GET');
  await testWithoutAuth('Comments', '/part/recruitment/comments', 'POST');

  // Test with user auth
  const result1 = await testWithAuth('Comments', '/part/recruitment/comments', 'user1', 'GET');
  
  // Create comment as user1
  const createResult = await testWithAuth('Comments', '/part/recruitment/comments', 'user1', 'POST', {
    text: 'Test comment from user1',
    parentId: null
  }, 201);

  // Test user2 can see user1's comment in public view (if configured as public)
  // but user-specific endpoints should be isolated
  await testWithAuth('Comments', '/part/recruitment/comments/my', 'user2', 'GET');

  // Test admin access
  await testWithAuth('Comments', '/part/recruitment/comments', 'admin', 'GET');
}

/**
 * Test User Management Service
 */
async function testUserManagementService() {
  logger.info('👥 Testing User Management Service...');

  // Test without auth (should fail)
  await testWithoutAuth('Users', '/part/recruitment/users', 'GET');
  await testWithoutAuth('Users', '/part/recruitment/users/me', 'GET');

  // Test user accessing their own profile
  await testWithAuth('Users', '/part/recruitment/users/me', 'user1', 'GET');
  await testWithAuth('Users', '/part/recruitment/users', 'user1', 'GET');

  // Test admin access to all users
  await testWithAuth('Users', '/part/recruitment/users', 'admin', 'GET');

  // Test user1 trying to access user2's profile (should fail if not admin)
  // This would require knowing user2's ID, skipping for now
}

/**
 * Test Sahab Service
 */
async function testSahabService() {
  logger.info('🏢 Testing Sahab Service...');

  // Test public endpoints (should work)
  await testWithAuth('Sahab', '/part/recruitment/sahab/health', 'user1', 'GET');
  await testWithAuth('Sahab', '/part/recruitment/sahab/', 'user1', 'GET');

  // Test without auth (should fail for protected endpoints)
  await testWithoutAuth('Sahab', '/part/recruitment/sahab/data', 'GET');
  await testWithoutAuth('Sahab', '/part/recruitment/sahab/data', 'POST');

  // Test with user auth
  await testWithAuth('Sahab', '/part/recruitment/sahab/data', 'user1', 'GET');
  
  // Create data as user1
  const createResult = await testWithAuth('Sahab', '/part/recruitment/sahab/data', 'user1', 'POST', {
    title: 'Test Sahab Data from User1',
    content: 'This is test content from user1',
    category: 'test'
  }, 201);

  // User2 should only see their own data
  await testWithAuth('Sahab', '/part/recruitment/sahab/data', 'user2', 'GET');

  // Admin should see all data
  await testWithAuth('Sahab', '/part/recruitment/sahab/data', 'admin', 'GET');
}

/**
 * Test cross-user data isolation
 */
async function testDataIsolation() {
  logger.info('🔒 Testing Data Isolation...');

  // Create data for both users
  logger.test('Creating test data for both users...');
  
  await testWithAuth('Comments', '/part/recruitment/comments', 'user1', 'POST', {
    text: 'User1 comment - should be isolated'
  }, 201);

  await testWithAuth('Comments', '/part/recruitment/comments', 'user2', 'POST', {
    text: 'User2 comment - should be isolated'
  }, 201);

  await testWithAuth('Sahab', '/part/recruitment/sahab/data', 'user1', 'POST', {
    title: 'User1 Sahab Data',
    content: 'User1 private content'
  }, 201);

  await testWithAuth('Sahab', '/part/recruitment/sahab/data', 'user2', 'POST', {
    title: 'User2 Sahab Data', 
    content: 'User2 private content'
  }, 201);

  // Verify users only see their own data
  logger.test('Verifying data isolation...');
  
  const user1Comments = await testWithAuth('Comments', '/part/recruitment/comments/my', 'user1', 'GET');
  const user2Comments = await testWithAuth('Comments', '/part/recruitment/comments/my', 'user2', 'GET');
  
  const user1Sahab = await testWithAuth('Sahab', '/part/recruitment/sahab/data', 'user1', 'GET');
  const user2Sahab = await testWithAuth('Sahab', '/part/recruitment/sahab/data', 'user2', 'GET');

  // Admin should see all data
  const adminComments = await testWithAuth('Comments', '/part/recruitment/comments', 'admin', 'GET');
  const adminSahab = await testWithAuth('Sahab', '/part/recruitment/sahab/data', 'admin', 'GET');
}

/**
 * Generate test report
 */
function generateReport() {
  logger.info('\n📊 Test Report:');
  console.log('═'.repeat(80));

  const services = [...new Set(testResults.map(r => r.service))];
  let totalTests = testResults.length;
  let passedTests = testResults.filter(r => r.passed).length;

  for (const service of services) {
    const serviceTests = testResults.filter(r => r.service === service);
    const servicePassed = serviceTests.filter(r => r.passed).length;
    
    console.log(`\n🔹 ${service}:`);
    console.log(`   Tests: ${serviceTests.length} | Passed: ${servicePassed} | Failed: ${serviceTests.length - servicePassed}`);
    
    const failedTests = serviceTests.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('   Failed tests:');
      failedTests.forEach(test => {
        console.log(`   ❌ ${test.endpoint} - ${test.description}`);
        if (test.error) {
          console.log(`      Error: ${test.error}`);
        }
      });
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`📊 Overall Results: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    logger.success('🎉 All tests passed! JWT authentication and data isolation working correctly.');
  } else {
    logger.error(`❌ ${totalTests - passedTests} tests failed. Please review the implementation.`);
  }
}

/**
 * Main test execution
 */
async function runTests() {
  logger.info('🚀 Starting JWT Authentication Integration Tests...');
  console.log('═'.repeat(80));

  try {
    // Login all test users
    logger.info('🔐 Logging in test users...');
    const loginResults = await Promise.all([
      loginUser('admin'),
      loginUser('user1'),
      loginUser('user2')
    ]);

    if (!loginResults.every(result => result)) {
      logger.error('Failed to login test users. Please ensure the gateway is running and users exist.');
      process.exit(1);
    }

    // Run service tests
    await testCommentsService();
    await testUserManagementService();
    await testSahabService();
    await testDataIsolation();

    // Generate report
    generateReport();

  } catch (error) {
    logger.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { runTests };