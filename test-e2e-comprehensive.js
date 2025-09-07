/**
 * Comprehensive E2E Test Suite
 * Tests the complete user flow: registration -> login -> CRUD operations on comments
 */

// Using Node.js built-in fetch (available in Node 18+)

// Test configuration
const GATEWAY_URL = 'http://localhost:3000';
const COMMENTS_URL = 'http://localhost:3001';

// Test data
const testUser = {
  email: `testuser-${Date.now()}@e2e.com`,
  password: 'TestPassword123',
  firstName: 'E2E',
  lastName: 'TestUser'
};

let authToken = null;
let userId = null;
let createdComments = [];

// Utility functions
const makeRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers
    },
    ...options
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  
  return { response, data, status: response.status };
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test functions
async function testUserRegistration() {
  console.log('\n🔄 Testing User Registration...');
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(testUser)
  });

  if (status === 201 && data.success) {
    userId = data.data.id;
    console.log('✅ User registration successful');
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${data.data.email}`);
    return true;
  } else {
    console.log('❌ User registration failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testUserLogin() {
  console.log('\n🔄 Testing User Login...');
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });

  if (status === 200 && data.success && data.token) {
    authToken = data.token;
    console.log('✅ User login successful');
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    return true;
  } else {
    console.log('❌ User login failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testUserProfile() {
  console.log('\n🔄 Testing User Profile...');
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/auth/profile`, {
    method: 'GET'
  });

  if (status === 200 && data.success && data.data) {
    console.log('✅ User profile retrieved successfully');
    console.log(`   User: ${data.data.firstName} ${data.data.lastName}`);
    console.log(`   Email: ${data.data.email}`);
    return true;
  } else {
    console.log('❌ User profile failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testCreateComment() {
  console.log('\n🔄 Testing Comment Creation...');
  
  const commentText = `E2E Test Comment - ${Date.now()}`;
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments`, {
    method: 'POST',
    body: JSON.stringify({
      text: commentText
    })
  });

  if (status === 201 && data.success && data.data) {
    createdComments.push(data.data);
    console.log('✅ Comment created successfully');
    console.log(`   Comment ID: ${data.data.id}`);
    console.log(`   Text: ${data.data.text}`);
    return true;
  } else {
    console.log('❌ Comment creation failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testCreateReplyComment() {
  if (createdComments.length === 0) {
    console.log('⚠️  Skipping reply comment test - no parent comment available');
    return true;
  }

  console.log('\n🔄 Testing Reply Comment Creation...');
  
  const parentComment = createdComments[0];
  const replyText = `Reply to comment - ${Date.now()}`;
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments`, {
    method: 'POST',
    body: JSON.stringify({
      text: replyText,
      parentId: parentComment.id
    })
  });

  if (status === 201 && data.success && data.data) {
    createdComments.push(data.data);
    console.log('✅ Reply comment created successfully');
    console.log(`   Reply ID: ${data.data.id}`);
    console.log(`   Parent ID: ${data.data.parentId}`);
    console.log(`   Text: ${data.data.text}`);
    return true;
  } else {
    console.log('❌ Reply comment creation failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testGetComments() {
  console.log('\n🔄 Testing Get Comments...');
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments`, {
    method: 'GET'
  });

  if (status === 200 && data.success && data.data) {
    console.log('✅ Comments retrieved successfully');
    console.log(`   Comments count: ${data.data.comments?.length || 'N/A'}`);
    console.log(`   Pagination: page ${data.data.pagination?.page || 'N/A'}, total ${data.data.pagination?.total || 'N/A'}`);
    return true;
  } else {
    console.log('❌ Get comments failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testGetMyComments() {
  console.log('\n🔄 Testing Get My Comments...');
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments/my`, {
    method: 'GET'
  });

  if (status === 200 && data.success && data.data) {
    console.log('✅ My comments retrieved successfully');
    console.log(`   My comments count: ${data.data.comments?.length || 'N/A'}`);
    return true;
  } else {
    console.log('❌ Get my comments failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testUpdateComment() {
  if (createdComments.length === 0) {
    console.log('⚠️  Skipping update comment test - no comments available');
    return true;
  }

  console.log('\n🔄 Testing Comment Update...');
  
  const commentToUpdate = createdComments[0];
  const updatedText = `Updated E2E Test Comment - ${Date.now()}`;
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments/${commentToUpdate.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      text: updatedText
    })
  });

  if (status === 200 && data.success && data.data) {
    console.log('✅ Comment updated successfully');
    console.log(`   Updated text: ${data.data.text}`);
    return true;
  } else {
    console.log('❌ Comment update failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testLikeComment() {
  if (createdComments.length === 0) {
    console.log('⚠️  Skipping like comment test - no comments available');
    return true;
  }

  console.log('\n🔄 Testing Like Comment...');
  
  const commentToLike = createdComments[0];
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments/${commentToLike.id}/like`, {
    method: 'POST'
  });

  if (status === 200 && data.success && data.data) {
    console.log('✅ Comment liked successfully');
    console.log(`   Likes: ${data.data.likes}`);
    return true;
  } else {
    console.log('❌ Comment like failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testDislikeComment() {
  if (createdComments.length === 0) {
    console.log('⚠️  Skipping dislike comment test - no comments available');
    return true;
  }

  console.log('\n🔄 Testing Dislike Comment...');
  
  const commentToDislike = createdComments[0];
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments/${commentToDislike.id}/dislike`, {
    method: 'POST'
  });

  if (status === 200 && data.success && data.data) {
    console.log('✅ Comment disliked successfully');
    console.log(`   Dislikes: ${data.data.dislikes}`);
    return true;
  } else {
    console.log('❌ Comment dislike failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testSearchComments() {
  console.log('\n🔄 Testing Search Comments...');
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments/search?q=test&limit=5`, {
    method: 'GET'
  });

  if (status === 200 && data.success && data.data) {
    console.log('✅ Comment search successful');
    console.log(`   Search results: ${data.data.comments?.length || 0} comments`);
    return true;
  } else {
    console.log('❌ Comment search failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testCommentStats() {
  console.log('\n🔄 Testing Comment Statistics...');
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments/stats`, {
    method: 'GET'
  });

  if (status === 200 && data.success && data.data) {
    console.log('✅ Comment statistics retrieved successfully');
    console.log(`   Total comments: ${data.data.totalComments || 'N/A'}`);
    console.log(`   Active comments: ${data.data.activeComments || 'N/A'}`);
    return true;
  } else {
    console.log('❌ Comment statistics failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testDeleteComment() {
  if (createdComments.length === 0) {
    console.log('⚠️  Skipping delete comment test - no comments available');
    return true;
  }

  console.log('\n🔄 Testing Comment Deletion...');
  
  const commentToDelete = createdComments[createdComments.length - 1]; // Delete the last comment
  
  const { response, data, status } = await makeRequest(`${GATEWAY_URL}/api/comments/${commentToDelete.id}`, {
    method: 'DELETE'
  });

  if (status === 200 && data.success) {
    console.log('✅ Comment deleted successfully');
    return true;
  } else {
    console.log('❌ Comment deletion failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testServicesHealth() {
  console.log('\n🔄 Testing Services Health...');
  
  // Test Gateway Health
  const gatewayHealth = await makeRequest(`${GATEWAY_URL}/health`, {
    method: 'GET'
  });

  // Test Comments Service Health
  const commentsHealth = await makeRequest(`${COMMENTS_URL}/health`, {
    method: 'GET'
  });

  let gatewayOk = gatewayHealth.status === 200 && gatewayHealth.data.status === 'OK';
  let commentsOk = commentsHealth.status === 200 && commentsHealth.data.success === true;

  if (gatewayOk && commentsOk) {
    console.log('✅ All services are healthy');
    console.log(`   Gateway: ${gatewayHealth.data.status}`);
    console.log(`   Comments: ${commentsHealth.data.message}`);
    return true;
  } else {
    console.log('❌ Some services are not healthy');
    console.log(`   Gateway: ${gatewayOk ? 'OK' : 'FAILED'}`);
    console.log(`   Comments: ${commentsOk ? 'OK' : 'FAILED'}`);
    return false;
  }
}

// Main test runner
async function runComprehensiveE2ETests() {
  console.log('🚀 Starting Comprehensive E2E Tests\n');
  console.log('==================================');

  const tests = [
    { name: 'Services Health Check', fn: testServicesHealth },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'User Profile', fn: testUserProfile },
    { name: 'Create Comment', fn: testCreateComment },
    { name: 'Create Reply Comment', fn: testCreateReplyComment },
    { name: 'Get Comments', fn: testGetComments },
    { name: 'Get My Comments', fn: testGetMyComments },
    { name: 'Update Comment', fn: testUpdateComment },
    { name: 'Like Comment', fn: testLikeComment },
    { name: 'Dislike Comment', fn: testDislikeComment },
    { name: 'Search Comments', fn: testSearchComments },
    { name: 'Comment Statistics', fn: testCommentStats },
    { name: 'Delete Comment', fn: testDeleteComment }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      } else {
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failedTests++;
    }
    
    // Small delay between tests
    await sleep(500);
  }

  console.log('\n==================================');
  console.log('🏁 E2E Test Results Summary');
  console.log('==================================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${passedTests + failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);

  if (failedTests > 0) {
    console.log('\n⚠️  Some tests failed. Please check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed successfully!');
    process.exit(0);
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveE2ETests().catch(error => {
    console.error('💥 Comprehensive E2E test suite failed:', error);
    process.exit(1);
  });
}