import fs from 'fs';
import path from 'path';

export default async function globalTeardown() {
  // Clean up test database
  const testDbPath = path.join(process.cwd(), 'prisma', 'test.db');
  
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (error) {
      console.warn('Could not clean up test database:', error.message);
    }
  }
  
  // Clean up any other test artifacts
  const testDbJournal = path.join(process.cwd(), 'prisma', 'test.db-journal');
  if (fs.existsSync(testDbJournal)) {
    try {
      fs.unlinkSync(testDbJournal);
    } catch (error) {
      console.warn('Could not clean up test database journal:', error.message);
    }
  }
  
  console.log('🧹 Global test teardown completed');
}