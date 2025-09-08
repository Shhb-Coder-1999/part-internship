/**
 * Database Clients
 * Exports configured database clients
 */

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

// Handle cleanup
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;