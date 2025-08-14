/**
 * Performance Testing Utilities
 * Using autocannon for load testing
 */

import autocannon from 'autocannon';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Default autocannon configuration
 */
const DEFAULT_CONFIG = {
  duration: 10,
  connections: 10,
  pipelining: 1,
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Run performance test against an endpoint
 * @param {string} url - Target URL
 * @param {Object} options - Test configuration
 * @returns {Promise<Object>} Test results
 */
export async function runPerformanceTest(url, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options, url };
  
  console.log(`🚀 Starting performance test for: ${url}`);
  console.log(`⏱️  Duration: ${config.duration}s, Connections: ${config.connections}`);
  
  try {
    const result = await autocannon(config);
    
    // Format results
    const summary = {
      url,
      timestamp: new Date().toISOString(),
      duration: result.duration,
      connections: result.connections,
      pipelining: result.pipelining,
      throughput: {
        requestsPerSecond: result.requests.average,
        bytesPerSecond: result.throughput.average,
        totalRequests: result.requests.total,
        totalBytes: result.throughput.total
      },
      latency: {
        average: result.latency.average,
        p50: result.latency.p50,
        p90: result.latency.p90,
        p95: result.latency.p95,
        p99: result.latency.p99,
        max: result.latency.max
      },
      errors: result.errors,
      timeouts: result.timeouts,
      non2xx: result.non2xx
    };
    
    console.log('📊 Performance Test Results:');
    console.log(`   Requests/sec: ${summary.throughput.requestsPerSecond}`);
    console.log(`   Latency (avg): ${summary.latency.average}ms`);
    console.log(`   Latency (p95): ${summary.latency.p95}ms`);
    console.log(`   Total requests: ${summary.throughput.totalRequests}`);
    console.log(`   Errors: ${summary.errors}`);
    
    return summary;
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    throw error;
  }
}

/**
 * Run comprehensive API performance tests
 * @param {string} baseUrl - Base URL of the service
 * @param {Array} endpoints - Array of endpoint configurations
 * @returns {Promise<Array>} All test results
 */
export async function runApiPerformanceTests(baseUrl, endpoints) {
  const results = [];
  
  console.log(`🧪 Running API performance tests for: ${baseUrl}`);
  
  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint.path}`;
    const options = {
      method: endpoint.method || 'GET',
      duration: endpoint.duration || 10,
      connections: endpoint.connections || 10,
      ...endpoint.options
    };
    
    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }
    
    try {
      const result = await runPerformanceTest(url, options);
      results.push({
        endpoint: endpoint.name || endpoint.path,
        ...result
      });
    } catch (error) {
      console.error(`❌ Failed to test ${endpoint.path}:`, error.message);
      results.push({
        endpoint: endpoint.name || endpoint.path,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

/**
 * Save performance test results to file
 * @param {Array|Object} results - Test results
 * @param {string} filename - Output filename
 */
export function savePerformanceResults(results, filename = 'performance-results.json') {
  const outputPath = join(process.cwd(), 'test-results', filename);
  
  try {
    writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`📁 Results saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to save results:', error);
  }
}

/**
 * Generate performance benchmark configuration
 * @param {string} serviceName - Name of the service
 * @returns {Array} Benchmark endpoints
 */
export function generateBenchmarkConfig(serviceName) {
  return [
    {
      name: 'Health Check',
      path: '/health',
      method: 'GET',
      duration: 5,
      connections: 5
    },
    {
      name: 'API Status',
      path: '/api/status',
      method: 'GET',
      duration: 10,
      connections: 10
    },
    {
      name: 'Load Test',
      path: '/api/status',
      method: 'GET',
      duration: 30,
      connections: 50
    }
  ];
}

/**
 * Compare performance results
 * @param {Object} baseline - Baseline results
 * @param {Object} current - Current results
 * @returns {Object} Comparison analysis
 */
export function comparePerformanceResults(baseline, current) {
  const comparison = {
    timestamp: new Date().toISOString(),
    baseline: baseline.timestamp,
    current: current.timestamp,
    metrics: {}
  };
  
  // Compare throughput
  const baselineRps = baseline.throughput.requestsPerSecond;
  const currentRps = current.throughput.requestsPerSecond;
  const rpsChange = ((currentRps - baselineRps) / baselineRps) * 100;
  
  comparison.metrics.requestsPerSecond = {
    baseline: baselineRps,
    current: currentRps,
    change: rpsChange,
    status: rpsChange >= -5 ? 'pass' : 'fail' // 5% tolerance
  };
  
  // Compare latency
  const baselineLatency = baseline.latency.p95;
  const currentLatency = current.latency.p95;
  const latencyChange = ((currentLatency - baselineLatency) / baselineLatency) * 100;
  
  comparison.metrics.latencyP95 = {
    baseline: baselineLatency,
    current: currentLatency,
    change: latencyChange,
    status: latencyChange <= 10 ? 'pass' : 'fail' // 10% tolerance
  };
  
  // Overall status
  comparison.status = Object.values(comparison.metrics).every(m => m.status === 'pass') ? 'pass' : 'fail';
  
  return comparison;
}

export default {
  runPerformanceTest,
  runApiPerformanceTests,
  savePerformanceResults,
  generateBenchmarkConfig,
  comparePerformanceResults
};
