#!/usr/bin/env node

/**
 * Setup script for Comments API
 * Automates the initial setup process
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runCommand(command, cwd = __dirname) {
  try {
    console.log(`🔄 Running: ${command}`);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ Failed to run: ${command}`);
    return false;
  }
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if node_modules exists
  if (!existsSync(join(__dirname, 'node_modules'))) {
    console.log('📦 Installing dependencies...');
    if (!runCommand('npm install')) {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
  } else {
    console.log('✅ Dependencies already installed');
  }
}

function setupDatabase() {
  console.log('\n🗄️ Setting up database...');
  
  // Generate Prisma client
  console.log('🔧 Generating Prisma client...');
  if (!runCommand('npm run db:generate')) {
    console.error('❌ Failed to generate Prisma client');
    process.exit(1);
  }
  
  // Push schema to database
  console.log('📊 Creating database tables...');
  if (!runCommand('npm run db:push')) {
    console.error('❌ Failed to create database tables');
    process.exit(1);
  }
  
  // Seed database
  console.log('🌱 Seeding database with sample data...');
  if (!runCommand('npm run db:seed')) {
    console.error('❌ Failed to seed database');
    process.exit(1);
  }
}

function showNextSteps() {
  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. View your data: npm run db:studio');
  console.log('3. Test the API: npm test');
  console.log('\n🌐 Your API will be available at: http://localhost:3000');
  console.log('📊 Prisma Studio will be available at: http://localhost:5555');
}

async function main() {
  console.log('🚀 Setting up Comments API with Prisma...\n');
  
  try {
    checkPrerequisites();
    setupDatabase();
    showNextSteps();
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
