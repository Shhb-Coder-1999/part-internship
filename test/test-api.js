import http from 'http';
import { URL } from 'url';

const BASE_URL = 'http://172.30.230.15:3000';
const API_BASE = `${BASE_URL}/api/comments`;

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

// Helper function to make HTTP requests
function makeRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test helper function
function runTest(testName, testFunction) {
  return async () => {
    try {
      console.log(`\n🧪 Running: ${testName}`);
      await testFunction();
      console.log(`✅ PASSED: ${testName}`);
      testsPassed++;
      testResults.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Error: ${error.message}`);
      testsFailed++;
      testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  };
}

// Test scenarios
const tests = [
  // 1. Health Check
  runTest('Health Check', async () => {
    const response = await makeRequest('GET', `${BASE_URL}/health`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (response.body.status !== 'success') {
      throw new Error(`Expected status 'success', got '${response.body.status}'`);
    }
  }),

  // 2. Get All Comments
  runTest('Get All Comments', async () => {
    const response = await makeRequest('GET', API_BASE);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (!Array.isArray(response.body.data)) {
      throw new Error('Expected data to be an array');
    }
    if (response.body.data.length === 0) {
      throw new Error('Expected at least one comment in initial data');
    }
  }),

  // 3. Create New Comment
  runTest('Create New Comment', async () => {
    const commentData = { text: 'This is a test comment' };
    const response = await makeRequest('POST', API_BASE, commentData);
    if (response.statusCode !== 201) {
      throw new Error(`Expected status 201, got ${response.statusCode}`);
    }
    if (!response.body.data.id) {
      throw new Error('Expected comment ID in response');
    }
    if (!response.body.data.createdAt) {
      throw new Error('Expected createdAt timestamp in response');
    }
  }),

  // 4. Create Comment with Empty Text (Should Fail)
  runTest('Create Comment with Empty Text (Should Fail)', async () => {
    const commentData = { text: '' };
    const response = await makeRequest('POST', API_BASE, commentData);
    if (response.statusCode !== 400) {
      throw new Error(`Expected status 400, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 5. Create Comment with Too Long Text (Should Fail)
  runTest('Create Comment with Too Long Text (Should Fail)', async () => {
    const longText = 'a'.repeat(251);
    const commentData = { text: longText };
    const response = await makeRequest('POST', API_BASE, commentData);
    if (response.statusCode !== 400) {
      throw new Error(`Expected status 400, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 6. Create Reply to Existing Comment
  runTest('Create Reply to Existing Comment', async () => {
    const replyData = { 
      text: 'This is a reply to comment_123', 
      parentId: 'comment_123' 
    };
    const response = await makeRequest('POST', API_BASE, replyData);
    if (response.statusCode !== 201) {
      throw new Error(`Expected status 201, got ${response.statusCode}`);
    }
    if (!response.body.data.id) {
      throw new Error('Expected comment ID in response');
    }
  }),

  // 7. Create Reply to Non-existent Comment (Should Fail)
  runTest('Create Reply to Non-existent Comment (Should Fail)', async () => {
    const replyData = { 
      text: 'This is a reply to non-existent comment', 
      parentId: 'non_existent_comment' 
    };
    const response = await makeRequest('POST', API_BASE, replyData);
    if (response.statusCode !== 404) {
      throw new Error(`Expected status 404, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 8. Get Replies to Specific Comment
  runTest('Get Replies to Specific Comment', async () => {
    const response = await makeRequest('GET', `${API_BASE}?parentId=comment_123`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (!Array.isArray(response.body.data)) {
      throw new Error('Expected data to be an array');
    }
    // Should have at least 2 replies based on initial data
    if (response.body.data.length < 2) {
      throw new Error(`Expected at least 2 replies, got ${response.body.data.length}`);
    }
  }),

  // 9. Update Existing Comment
  runTest('Update Existing Comment', async () => {
    const updateData = { text: 'Updated comment text' };
    const response = await makeRequest('PATCH', `${API_BASE}/comment_123`, updateData);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (!response.body.data.updatedAt) {
      throw new Error('Expected updatedAt timestamp in response');
    }
  }),

  // 10. Update Non-existent Comment (Should Fail)
  runTest('Update Non-existent Comment (Should Fail)', async () => {
    const updateData = { text: 'Updated comment text' };
    const response = await makeRequest('PATCH', `${API_BASE}/non_existent_comment`, updateData);
    if (response.statusCode !== 404) {
      throw new Error(`Expected status 404, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 11. Update Comment with Empty Text (Should Fail)
  runTest('Update Comment with Empty Text (Should Fail)', async () => {
    const updateData = { text: '' };
    const response = await makeRequest('PATCH', `${API_BASE}/comment_123`, updateData);
    if (response.statusCode !== 400) {
      throw new Error(`Expected status 400, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 12. Like Comment
  runTest('Like Comment', async () => {
    const response = await makeRequest('POST', `${API_BASE}/comment_123/like`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (!response.body.data.likes || response.body.data.likes < 6) {
      throw new Error(`Expected likes to be at least 6, got ${response.body.data.likes}`);
    }
    if (response.body.data.id !== 'comment_123') {
      throw new Error(`Expected comment ID 'comment_123', got '${response.body.data.id}'`);
    }
  }),

  // 13. Dislike Comment
  runTest('Dislike Comment', async () => {
    const response = await makeRequest('POST', `${API_BASE}/comment_123/dislike`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (!response.body.data.dislikes || response.body.data.dislikes < 3) {
      throw new Error(`Expected dislikes to be at least 3, got ${response.body.data.dislikes}`);
    }
    if (response.body.data.id !== 'comment_123') {
      throw new Error(`Expected comment ID 'comment_123', got '${response.body.data.id}'`);
    }
  }),

  // 14. Like Non-existent Comment (Should Fail)
  runTest('Like Non-existent Comment (Should Fail)', async () => {
    const response = await makeRequest('POST', `${API_BASE}/non_existent_comment/like`);
    if (response.statusCode !== 404) {
      throw new Error(`Expected status 404, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 15. Dislike Non-existent Comment (Should Fail)
  runTest('Dislike Non-existent Comment (Should Fail)', async () => {
    const response = await makeRequest('POST', `${API_BASE}/non_existent_comment/dislike`);
    if (response.statusCode !== 404) {
      throw new Error(`Expected status 404, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 16. Delete Comment (Soft Delete)
  runTest('Delete Comment (Soft Delete)', async () => {
    const response = await makeRequest('DELETE', `${API_BASE}/comment_201`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (response.body.status !== 'success') {
      throw new Error(`Expected status 'success', got '${response.body.status}'`);
    }
    if (!response.body.message.includes('soft-deleted successfully')) {
      throw new Error('Expected success message about soft deletion');
    }
  }),

  // 17. Delete Non-existent Comment (Should Fail)
  runTest('Delete Non-existent Comment (Should Fail)', async () => {
    const response = await makeRequest('DELETE', `${API_BASE}/non_existent_comment`);
    if (response.statusCode !== 404) {
      throw new Error(`Expected status 404, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 18. Delete Already Deleted Comment (Should Fail)
  runTest('Delete Already Deleted Comment (Should Fail)', async () => {
    const response = await makeRequest('DELETE', `${API_BASE}/comment_201`);
    if (response.statusCode !== 400) {
      throw new Error(`Expected status 400, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 19. Get Comments Including Deleted
  runTest('Get Comments Including Deleted', async () => {
    const response = await makeRequest('GET', `${API_BASE}?includeDeleted=true`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (!Array.isArray(response.body.data)) {
      throw new Error('Expected data to be an array');
    }
    // Should include the deleted comment
    const deletedComment = response.body.data.find(c => c.id === 'comment_201');
    if (!deletedComment) {
      throw new Error('Expected to find deleted comment when includeDeleted=true');
    }
    if (!deletedComment.isDeleted) {
      throw new Error('Expected deleted comment to have isDeleted=true');
    }
  }),

  // 20. Get Comments Excluding Deleted (Default)
  runTest('Get Comments Excluding Deleted (Default)', async () => {
    const response = await makeRequest('GET', API_BASE);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (!Array.isArray(response.body.data)) {
      throw new Error('Expected data to be an array');
    }
    // Should not include the deleted comment
    const deletedComment = response.body.data.find(c => c.id === 'comment_201');
    if (deletedComment) {
      throw new Error('Expected to not find deleted comment when includeDeleted=false');
    }
  }),

  // 21. Test Persian/Arabic Text Support
  runTest('Test Persian/Arabic Text Support', async () => {
    const persianText = 'این یک کامنت فارسی است';
    const commentData = { text: persianText };
    const response = await makeRequest('POST', API_BASE, commentData);
    if (response.statusCode !== 201) {
      throw new Error(`Expected status 201, got ${response.statusCode}`);
    }
    if (!response.body.data.id) {
      throw new Error('Expected comment ID in response');
    }
  }),

  // 22. Test 404 Route
  runTest('Test 404 Route', async () => {
    const response = await makeRequest('GET', `${BASE_URL}/non-existent-route`);
    if (response.statusCode !== 404) {
      throw new Error(`Expected status 404, got ${response.statusCode}`);
    }
    if (response.body.status !== 'error') {
      throw new Error(`Expected status 'error', got '${response.body.status}'`);
    }
  }),

  // 23. Test Root Endpoint
  runTest('Test Root Endpoint', async () => {
    const response = await makeRequest('GET', BASE_URL);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (!response.body.message) {
      throw new Error('Expected message in response');
    }
    if (!response.body.endpoints) {
      throw new Error('Expected endpoints in response');
    }
  }),
];

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting API Tests...\n');
  console.log('=' .repeat(50));
  
  for (const test of tests) {
    await test();
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(result => result.status === 'FAILED')
      .forEach(result => {
        console.log(`   - ${result.name}: ${result.error}`);
      });
  }
  
  if (testsPassed === tests.length) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  }
}

// Check if server is running before starting tests
async function checkServer() {
  try {
    await makeRequest('GET', `${BASE_URL}/health`);
    console.log('✅ Server is running, starting tests...');
    await runAllTests();
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   npm start');
    process.exit(1);
  }
}

checkServer(); 