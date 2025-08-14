#!/usr/bin/env node

/**
 * Test Runner Script for Comments App
 * Provides flexible test execution with different configurations
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configurations
const testConfigs = {
  unit: {
    pattern: 'tests/unit/**/*.test.js',
    description: 'Unit tests only'
  },
  integration: {
    pattern: 'tests/integration/**/*.test.js',
    description: 'Integration tests only'
  },
  e2e: {
    pattern: 'tests/e2e/**/*.test.js',
    description: 'End-to-end tests only'
  },
  performance: {
    pattern: 'tests/performance/**/*.test.js',
    description: 'Performance tests only'
  },
  all: {
    pattern: 'tests/**/*.test.js',
    description: 'All tests'
  },
  coverage: {
    pattern: 'tests/**/*.test.js',
    description: 'All tests with coverage report',
    coverage: true
  },
  watch: {
    pattern: 'tests/**/*.test.js',
    description: 'Watch mode for development',
    watch: true
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const config = testConfigs[testType];

if (!config) {
  console.error(`❌ Unknown test type: ${testType}`);
  console.log('\nAvailable test types:');
  Object.keys(testConfigs).forEach(type => {
    console.log(`  ${type}: ${testConfigs[type].description}`);
  });
  process.exit(1);
}

console.log(`🚀 Running ${config.description}...`);
console.log(`📁 Test pattern: ${config.pattern}`);
console.log('');

// Build Jest command
const jestArgs = [
  '--testPathPattern', config.pattern,
  '--verbose',
  '--detectOpenHandles',
  '--forceExit'
];

if (config.coverage) {
  jestArgs.push('--coverage');
}

if (config.watch) {
  jestArgs.push('--watch');
}

// Run Jest
const jestProcess = spawn('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: join(__dirname, '..')
});

jestProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All tests passed successfully!');
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(code);
  }
});

jestProcess.on('error', (error) => {
  console.error('❌ Error running tests:', error.message);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping tests...');
  jestProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping tests...');
  jestProcess.kill('SIGTERM');
});
