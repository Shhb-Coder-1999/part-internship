import { PrismaClient } from '@prisma/client';
import { passwordService } from '@shared/core/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating basic users...');

  // Create basic roles
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Regular user role',
      isActive: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator role',
      isActive: true,
    },
  });

  // Create test users
  const hashedPassword = await passwordService.hashPassword('password123');

  const testUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      isVerified: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      isVerified: true,
    },
  });

  // Assign roles
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: testUser.id,
        roleId: userRole.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      roleId: userRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: userRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: userRole.id,
    },
  });

  console.log('✅ Created users:');
  console.log('- user@example.com (password: password123)');
  console.log('- admin@example.com (password: password123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });