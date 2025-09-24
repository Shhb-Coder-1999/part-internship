/**
 * Jest Global Teardown
 */

import { unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Remove test database file
    const dbPath = join(__dirname, '..', 'test_part_bank.db');
    try {
      unlinkSync(dbPath);
      console.log('🗑️ Test database removed');
    } catch (error) {
      // File might not exist, that's okay
    }
    
    console.log('✅ Test environment cleanup completed');
  } catch (error) {
    console.error('❌ Test environment cleanup failed:', error);
  }
}