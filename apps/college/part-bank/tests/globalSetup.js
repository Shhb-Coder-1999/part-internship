/**
 * Jest Global Setup
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function globalSetup() {
  console.log('🔧 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test_part_bank.db';
  
  try {
    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    // Push database schema
    console.log('🗃️ Setting up test database...');
    execSync('npx prisma db push --force-reset', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    console.log('✅ Test environment setup completed');
  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    throw error;
  }
}