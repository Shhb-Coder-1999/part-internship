import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding gateway database...');

  try {
    // Create roles
    const userRole = await prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: {
        name: 'user',
        description: 'Standard user role',
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

    console.log('✅ Roles created/verified');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        isVerified: true,
      },
    });

    // Assign admin role to admin user
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
        isActive: true,
      },
    });

    // Create regular test user
    const hashedUserPassword = await bcrypt.hash('user123', 10);
    const testUser = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        passwordHash: hashedUserPassword,
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isVerified: true,
      },
    });

    // Assign user role to test user
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
        isActive: true,
      },
    });

    console.log('✅ Users created:');
    console.log(`   - ${adminUser.email} (admin)`);
    console.log(`   - ${testUser.email} (user)`);
    
    console.log('🎉 Gateway database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });