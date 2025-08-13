#!/usr/bin/env node

/**
 * Setup script for comment workspace
 * Installs dependencies and sets up the development environment
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const APPS = ['comments', 'user-management', 'sahab'];
const SHARED_MODULES = ['database', 'auth', 'utils', 'config'];

console.log('🚀 Setting up comment workspace...\n');

// Function to run commands
function runCommand(command, cwd = process.cwd()) {
  try {
    console.log(`📝 Running: ${command}`);
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      shell: true 
    });
    console.log(`✅ Success: ${command}\n`);
  } catch (error) {
    console.error(`❌ Failed: ${command}`);
    console.error(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Function to create directories if they don't exist
function ensureDirectory(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
    console.log(`📁 Created directory: ${path}`);
  }
}

// Main setup function
async function setup() {
  console.log('📁 Creating directory structure...');
  
  // Ensure all necessary directories exist
  APPS.forEach(app => {
    ensureDirectory(`apps/${app}`);
    ensureDirectory(`apps/${app}/src`);
    ensureDirectory(`apps/${app}/test`);
  });
  
  SHARED_MODULES.forEach(module => {
    ensureDirectory(`shared/${module}`);
  });
  
  ensureDirectory('tools/scripts');
  ensureDirectory('tools/docker');
  ensureDirectory('docs/api');
  ensureDirectory('docs/setup');
  ensureDirectory('docs/deployment');
  
  console.log('✅ Directory structure created\n');
  
  // Install root dependencies
  console.log('📦 Installing root dependencies...');
  runCommand('npm install');
  
  // Install app dependencies
  console.log('📦 Installing app dependencies...');
  APPS.forEach(app => {
    const appPath = `apps/${app}`;
    if (existsSync(join(appPath, 'package.json'))) {
      console.log(`\n📦 Installing dependencies for ${app}...`);
      runCommand('npm install', appPath);
    } else {
      console.log(`⚠️  No package.json found in ${appPath}, skipping...`);
    }
  });
  
  // Install shared module dependencies
  console.log('\n📦 Installing shared module dependencies...');
  if (existsSync('shared/package.json')) {
    runCommand('npm install', 'shared');
  }
  
  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Start individual apps:');
  console.log('   npm run dev:comments     # Comments API on port 3000');
  console.log('   npm run dev:users        # User Management on port 3001');
  console.log('   npm run dev:sahab        # Sahab on port 3002');
  console.log('\n2. Start all apps: npm run dev:all');
  console.log('\n3. Run tests: npm run test:all');
  console.log('\n4. View documentation: docs/README.md');
}

// Run setup
setup().catch(error => {
  console.error('💥 Setup failed:', error);
  process.exit(1);
}); 