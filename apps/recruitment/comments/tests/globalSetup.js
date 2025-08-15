import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-comments';
  
  // Create test database path
  const testDbPath = path.join(process.cwd(), 'prisma', 'comments_test.db');
  
  // Clean up any existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Set test database URL
  process.env.DATABASE_URL = `file:${testDbPath}`;
  
  console.log('🧪 Comments service test setup completed');
}