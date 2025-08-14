import { PrismaClient } from '@prisma/client';

// Reuse Prisma client in dev to avoid exhausting database connections on reloads
const globalKey = '__COMMENTS_PRISMA__';

/** @type {PrismaClient | undefined} */
let prisma = globalThis[globalKey];

if (!prisma) {
  prisma = new PrismaClient({
    log: ['warn', 'error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalThis[globalKey] = prisma;
  }
}

export default prisma;
