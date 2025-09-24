#!/usr/bin/env node

/**
 * Comprehensive Authentication Flow Test
 * Tests the full authentication flow between gateway and comments services
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

let gatewayProcess = null;
let commentsProcess = null;

// Test configuration
const GATEWAY_URL = 'http://localhost:3000';
const COMMENTS_URL = 'http://localhost:3001';
const TEST_USER = {
  email: 'user@example.com',
  password: 'password123'
};

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Start services
async function startServices() {
  logInfo('Starting services...');
  
  try {
    // Start gateway
    logInfo('Starting gateway service...');
    gatewayProcess = spawn('node', ['gateway.js'], {
      cwd: './packages/gateway-api',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    gatewayProcess.stdout.on('data', (data) => {
      console.log(`[Gateway] ${data.toString().trim()}`);
    });

    gatewayProcess.stderr.on('data', (data) => {
      console.error(`[Gateway Error] ${data.toString().trim()}`);
    });

    // Start comments service
    logInfo('Starting comments service...');
    commentsProcess = spawn('node', ['server.js'], {
      cwd: './apps/recruitment/comments',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    commentsProcess.stdout.on('data', (data) => {
      console.log(`[Comments] ${data.toString().trim()}`);
    });

    commentsProcess.stderr.on('data', (data) => {
      console.error(`[Comments Error] ${data.toString().trim()}`);
    });

    // Wait for services to start
    await setTimeout(5000);
    
    logSuccess('Services started');
  } catch (error) {
    logError(`Failed to start services: ${error.message}`);
    throw error;
  }
}

// Stop services
async function stopServices() {
  logInfo('Stopping services...');
  
  if (gatewayProcess) {
    gatewayProcess.kill();
  }
  
  if (commentsProcess) {
    commentsProcess.kill();
  }
  
  logSuccess('Services stopped');
}

// Test helper for HTTP requests
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const data = await response.text();
    let jsonData = null;
    
    try {
      jsonData = JSON.parse(data);
    } catch (e) {
      // Not JSON, that's ok
    }
    
    return {
      status: response.status,
      data: jsonData || data,
      headers: response.headers
    };
  } catch (error) {
    return {
      error: error.message,
      status: 0
    };
  }
}

// Test 1: Gateway health check
async function testGatewayHealth() {
  logInfo('Testing gateway health...');
  
  const response = await makeRequest(`${GATEWAY_URL}/health`);
  
  if (response.status === 200) {
    logSuccess('Gateway health check passed');
    return true;
  } else {
    logError(`Gateway health check failed: ${response.status} ${response.error || response.data}`);
    return false;
  }
}

// Test 2: Comments service health check
async function testCommentsHealth() {
  logInfo('Testing comments service health...');
  
  const response = await makeRequest(`${COMMENTS_URL}/health`);
  
  if (response.status === 200) {
    logSuccess('Comments service health check passed');
    return true;
  } else {
    logError(`Comments service health check failed: ${response.status} ${response.error || response.data}`);
    return false;
  }
}

// Test 3: User login
async function testUserLogin() {
  logInfo('Testing user login...');
  
  const response = await makeRequest(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    body: TEST_USER
  });
  
  if (response.status === 200 && response.data && response.data.token) {
    logSuccess('User login successful');
    return response.data.token;
  } else {
    logError(`User login failed: ${response.status} ${JSON.stringify(response.data)}`);
    return null;
  }
}

// Test 4: Access comments through gateway (authenticated)
async function testAuthenticatedCommentsAccess(token) {
  logInfo('Testing authenticated comments access through gateway...');
  
  const response = await makeRequest(`${GATEWAY_URL}/part/recruitment/comments`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 200) {
    logSuccess('Authenticated comments access successful');
    return true;
  } else {
    logError(`Authenticated comments access failed: ${response.status} ${JSON.stringify(response.data)}`);
    return false;
  }
}

// Test 5: Access comments through gateway (unauthenticated)
async function testUnauthenticatedCommentsAccess() {
  logInfo('Testing unauthenticated comments access through gateway...');
  
  const response = await makeRequest(`${GATEWAY_URL}/part/recruitment/comments`);
  
  if (response.status === 200) {
    logSuccess('Unauthenticated comments access successful (public endpoint)');
    return true;
  } else {
    logError(`Unauthenticated comments access failed: ${response.status} ${JSON.stringify(response.data)}`);
    return false;
  }
}

// Test 6: Create comment (authenticated)
async function testCreateComment(token) {
  logInfo('Testing comment creation...');
  
  const response = await makeRequest(`${GATEWAY_URL}/part/recruitment/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: {
      text: 'Test comment created via gateway'
    }
  });
  
  if (response.status === 201) {
    logSuccess('Comment creation successful');
    return true;
  } else {
    logError(`Comment creation failed: ${response.status} ${JSON.stringify(response.data)}`);
    return false;
  }
}

// Test 7: Create comment (unauthenticated) - should fail
async function testCreateCommentUnauthenticated() {
  logInfo('Testing comment creation without authentication (should fail)...');
  
  const response = await makeRequest(`${GATEWAY_URL}/part/recruitment/comments`, {
    method: 'POST',
    body: {
      text: 'This should fail'
    }
  });
  
  if (response.status === 401 || response.status === 403) {
    logSuccess('Comment creation correctly rejected without authentication');
    return true;
  } else {
    logError(`Comment creation should have failed but got: ${response.status} ${JSON.stringify(response.data)}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n🚀 Starting Authentication Flow Tests\n', colors.blue);
  
  let allTestsPassed = true;
  
  try {
    // Start services
    await startServices();
    
    // Run tests
    const tests = [
      testGatewayHealth,
      testCommentsHealth,
      testUserLogin,
      testUnauthenticatedCommentsAccess,
      testCreateCommentUnauthenticated,
    ];
    
    let token = null;
    
    for (const test of tests) {
      try {
        const result = await test(token);
        if (test === testUserLogin && result) {
          token = result; // Save token for authenticated tests
        }
        if (!result && test !== testUserLogin) {
          allTestsPassed = false;
        }
      } catch (error) {
        logError(`Test failed with error: ${error.message}`);
        allTestsPassed = false;
      }
      
      // Small delay between tests
      await setTimeout(1000);
    }
    
    // Run authenticated tests if we have a token
    if (token) {
      const authenticatedTests = [
        testAuthenticatedCommentsAccess,
        testCreateComment
      ];
      
      for (const test of authenticatedTests) {
        try {
          const result = await test(token);
          if (!result) {
            allTestsPassed = false;
          }
        } catch (error) {
          logError(`Authenticated test failed with error: ${error.message}`);
          allTestsPassed = false;
        }
        
        await setTimeout(1000);
      }
    } else {
      logWarning('Skipping authenticated tests - no token available');
      allTestsPassed = false;
    }
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    allTestsPassed = false;
  } finally {
    // Stop services
    await stopServices();
  }
  
  // Results
  log('\n📊 Test Results\n', colors.blue);
  
  if (allTestsPassed) {
    logSuccess('All tests passed! 🎉');
    logSuccess('Authentication flow is working correctly');
  } else {
    logError('Some tests failed! 😞');
    logError('Authentication flow needs fixing');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Handle process termination
process.on('SIGINT', async () => {
  logInfo('Received SIGINT, stopping services...');
  await stopServices();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logInfo('Received SIGTERM, stopping services...');
  await stopServices();
  process.exit(0);
});

// Run the tests
runTests().catch((error) => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});