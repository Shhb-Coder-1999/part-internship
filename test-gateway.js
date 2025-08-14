#!/usr/bin/env node

/**
 * Test Gateway Routing Script
 * Tests the actual API Gateway routing to comments and user services
 */

// Using native fetch API available in Node.js 18+

const GATEWAY_URL = 'http://localhost:3000';
const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m'
};

// Helper function for colored console output
function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

// Helper function to make HTTP requests
async function makeRequest(method, path, body = null) {
  const url = `${GATEWAY_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message
    };
  }
}

// Test suite for Gateway functionality
async function testGateway() {
  log('\n🚀 Starting API Gateway Tests', COLORS.CYAN);
  log('='.repeat(50), COLORS.CYAN);

  let passedTests = 0;
  let totalTests = 0;

  // Test function
  function test(name, expectedStatus, actualStatus, additionalChecks = null) {
    totalTests++;
    if (actualStatus === expectedStatus && (!additionalChecks || additionalChecks())) {
      log(`✅ ${name}`, COLORS.GREEN);
      passedTests++;
    } else {
      log(`❌ ${name} (Expected: ${expectedStatus}, Got: ${actualStatus})`, COLORS.RED);
    }
  }

  // 1. Test Gateway Health
  log('\n📊 Testing Gateway Health...', COLORS.YELLOW);
  const healthResponse = await makeRequest('GET', '/health');
  test('Gateway Health Check', 200, healthResponse.status);

  // 2. Test Gateway Root
  const rootResponse = await makeRequest('GET', '/');
  test('Gateway Root Endpoint', 200, rootResponse.status);

  // 3. Test Comments Service Routing
  log('\n💬 Testing Comments Service Routing...', COLORS.YELLOW);
  
  // Get all comments
  const getCommentsResponse = await makeRequest('GET', '/recruitment/comments');
  test('GET /recruitment/comments', 200, getCommentsResponse.status, () => {
    return getCommentsResponse.data && typeof getCommentsResponse.data === 'object';
  });

  // Create a comment
  const createCommentResponse = await makeRequest('POST', '/recruitment/comments', {
    text: 'Test comment from gateway'
  });
  test('POST /recruitment/comments', 201, createCommentResponse.status);

  let commentId = null;
  if (createCommentResponse.status === 201 && createCommentResponse.data && createCommentResponse.data.data) {
    commentId = createCommentResponse.data.data.id;
  }

  // If we have a comment ID, test other endpoints
  if (commentId) {
    // Get specific comment
    const getCommentResponse = await makeRequest('GET', `/recruitment/comments/${commentId}`);
    test('GET /recruitment/comments/:id', 200, getCommentResponse.status);

    // Update comment
    const updateCommentResponse = await makeRequest('PUT', `/recruitment/comments/${commentId}`, {
      text: 'Updated test comment from gateway'
    });
    test('PUT /recruitment/comments/:id', 200, updateCommentResponse.status);

    // Like comment
    const likeCommentResponse = await makeRequest('POST', `/recruitment/comments/${commentId}/like`);
    test('POST /recruitment/comments/:id/like', 200, likeCommentResponse.status);

    // Delete comment
    const deleteCommentResponse = await makeRequest('DELETE', `/recruitment/comments/${commentId}`);
    test('DELETE /recruitment/comments/:id', 204, deleteCommentResponse.status);
  }

  // Test with query parameters
  const commentsWithQueryResponse = await makeRequest('GET', '/recruitment/comments?page=1&limit=5');
  test('GET /recruitment/comments with query params', 200, commentsWithQueryResponse.status);

  // 4. Test User Management Service Routing
  log('\n👥 Testing User Management Service Routing...', COLORS.YELLOW);
  
  // Get all users
  const getUsersResponse = await makeRequest('GET', '/recruitment/users');
  test('GET /recruitment/users', 200, getUsersResponse.status, () => {
    return getUsersResponse.data && typeof getUsersResponse.data === 'object';
  });

  // Create a user
  const createUserResponse = await makeRequest('POST', '/recruitment/users', {
    email: 'gateway-test@example.com',
    username: 'gatewaytest',
    password: 'password123',
    firstName: 'Gateway',
    lastName: 'Test'
  });
  test('POST /recruitment/users', 201, createUserResponse.status);

  let userId = null;
  if (createUserResponse.status === 201 && createUserResponse.data && createUserResponse.data.data) {
    userId = createUserResponse.data.data.id;
  }

  // If we have a user ID, test other endpoints
  if (userId) {
    // Get specific user
    const getUserResponse = await makeRequest('GET', `/recruitment/users/${userId}`);
    test('GET /recruitment/users/:id', 200, getUserResponse.status);

    // Update user
    const updateUserResponse = await makeRequest('PUT', `/recruitment/users/${userId}`, {
      firstName: 'Updated Gateway',
      phone: '+1234567890'
    });
    test('PUT /recruitment/users/:id', 200, updateUserResponse.status);

    // Activate user
    const activateUserResponse = await makeRequest('POST', `/recruitment/users/${userId}/activate`);
    test('POST /recruitment/users/:id/activate', 200, activateUserResponse.status);

    // Deactivate user
    const deactivateUserResponse = await makeRequest('POST', `/recruitment/users/${userId}/deactivate`);
    test('POST /recruitment/users/:id/deactivate', 200, deactivateUserResponse.status);

    // Delete user
    const deleteUserResponse = await makeRequest('DELETE', `/recruitment/users/${userId}`);
    test('DELETE /recruitment/users/:id', 204, deleteUserResponse.status);
  }

  // Test with query parameters
  const usersWithQueryResponse = await makeRequest('GET', '/recruitment/users?page=1&limit=5&isActive=true');
  test('GET /recruitment/users with query params', 200, usersWithQueryResponse.status);

  // 5. Test Error Handling
  log('\n🚫 Testing Error Handling...', COLORS.YELLOW);

  // Test 404 for non-existent routes
  const notFoundResponse = await makeRequest('GET', '/nonexistent');
  test('404 for non-existent routes', 404, notFoundResponse.status);

  // Test 404 for non-existent comment
  const notFoundCommentResponse = await makeRequest('GET', '/recruitment/comments/non-existent-id');
  test('404 for non-existent comment', 404, notFoundCommentResponse.status);

  // Test 404 for non-existent user
  const notFoundUserResponse = await makeRequest('GET', '/recruitment/users/non-existent-id');
  test('404 for non-existent user', 404, notFoundUserResponse.status);

  // 6. Test CORS
  log('\n🌐 Testing CORS...', COLORS.YELLOW);
  const corsResponse = await makeRequest('OPTIONS', '/recruitment/comments');
  test('CORS preflight request', 204, corsResponse.status, () => {
    return corsResponse.headers['access-control-allow-origin'] !== undefined;
  });

  // Final Results
  log('\n📊 Test Results', COLORS.CYAN);
  log('='.repeat(50), COLORS.CYAN);
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  log(`Tests Passed: ${passedTests}/${totalTests} (${passRate}%)`, 
    passedTests === totalTests ? COLORS.GREEN : COLORS.YELLOW);

  if (passedTests === totalTests) {
    log('\n🎉 All tests passed! Gateway is working correctly.', COLORS.GREEN);
  } else {
    log('\n⚠️  Some tests failed. Check the output above for details.', COLORS.YELLOW);
    log('Make sure all services are running:', COLORS.YELLOW);
    log('- API Gateway on port 3000', COLORS.YELLOW);
    log('- Comments service on port 3001', COLORS.YELLOW);
    log('- User Management service on port 3002', COLORS.YELLOW);
  }

  return passedTests === totalTests;
}

// Show usage information
function showUsage() {
  log('\n🔧 Usage Instructions', COLORS.CYAN);
  log('='.repeat(50), COLORS.CYAN);
  log('This script tests the API Gateway routing functionality.', COLORS.YELLOW);
  log('Before running this script, make sure to start all services:', COLORS.YELLOW);
  log('', COLORS.RESET);
  log('1. Start Comments service:', COLORS.CYAN);
  log('   cd apps/recruitment/comments && npm start', COLORS.RESET);
  log('', COLORS.RESET);
  log('2. Start User Management service:', COLORS.CYAN);
  log('   cd apps/recruitment/user-management && npm start', COLORS.RESET);
  log('', COLORS.RESET);
  log('3. Start API Gateway:', COLORS.CYAN);
  log('   cd packages/gateway-api && npm start', COLORS.RESET);
  log('', COLORS.RESET);
  log('4. Run this test script:', COLORS.CYAN);
  log('   node test-gateway.js', COLORS.RESET);
  log('', COLORS.RESET);
}

// Main execution
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
} else {
  log('\n🧪 API Gateway Test Script', COLORS.CYAN);
  log('Testing gateway routing at http://localhost:3000', COLORS.CYAN);
  
  testGateway().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log(`\n💥 Unexpected error: ${error.message}`, COLORS.RED);
    process.exit(1);
  });
}