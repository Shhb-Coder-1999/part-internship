#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * One-command setup for the entire development environment
 */

import DevEnvironmentManager from './config.js';
import { WorkspacePrismaManager } from '../prisma/studio-config.js';

async function setupDevelopmentEnvironment() {
  console.log('🚀 Setting up development environment for part-internship...\n');
  
  try {
    const workspacePath = process.cwd();
    
    // Initialize development environment
    console.log('📋 Step 1: Configuring development environment...');
    const devManager = new DevEnvironmentManager(workspacePath);
    await devManager.initialize();
    
    // Initialize Prisma workspace tools
    console.log('\n📋 Step 2: Setting up Prisma workspace tools...');
    const prismaManager = new WorkspacePrismaManager(workspacePath);
    
    // Generate all Prisma clients
    console.log('   📦 Generating Prisma clients...');
    await prismaManager.generateAllClients();
    
    // Check database connections
    console.log('   🔌 Checking database connections...');
    for (const service of prismaManager.services) {
      await service.dbUtils.checkConnection();
    }
    
    // Install workspace dependencies if needed
    console.log('\n📋 Step 3: Installing dependencies...');
    const { spawn } = await import('child_process');
    
    await new Promise((resolve, reject) => {
      const install = spawn('pnpm', ['install'], {
        stdio: 'inherit',
        cwd: workspacePath
      });
      
      install.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pnpm install failed with code ${code}`));
        }
      });
    });
    
    // Setup Git hooks
    console.log('\n📋 Step 4: Setting up Git hooks...');
    await new Promise((resolve, reject) => {
      const husky = spawn('npx', ['husky', 'install'], {
        stdio: 'inherit',
        cwd: workspacePath
      });
      
      husky.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Don't fail the setup if husky fails
          console.log('   ⚠️  Husky setup skipped (optional)');
          resolve();
        }
      });
    });
    
    // Print success message and next steps
    console.log('\n🎉 Development environment setup complete!\n');
    
    // Print development information
    devManager.printDevInfo();
    
    console.log('🚀 Quick Start:');
    console.log('   1. Run `pnpm dev:parallel` to start all services');
    console.log('   2. Run `pnpm prisma:studio` to open database management');
    console.log('   3. Run `pnpm generate` to create new services/components');
    console.log('   4. Check VS Code for debugging configurations');
    console.log('\n✨ Happy coding!\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure you have Node.js 18+ installed');
    console.error('2. Make sure you have pnpm installed globally');
    console.error('3. Check if all required dependencies are available');
    console.error('4. Run the setup again after fixing any issues');
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDevelopmentEnvironment();
}

export default setupDevelopmentEnvironment;
