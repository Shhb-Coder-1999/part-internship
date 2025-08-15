/**
 * Simple Database Seeding
 * Basic seed without complex connection handling
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function simpleSeed() {
  try {
    console.log('🌱 Starting simple database seeding...');

    // Check if already seeded
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log('✅ Database already seeded, skipping...');
      return;
    }

    // Create basic permissions
    console.log('🔐 Creating permissions...');
    const permissions = [
      { name: 'user:read', resource: 'users', action: 'read', description: 'Read user data' },
      { name: 'user:write', resource: 'users', action: 'write', description: 'Write user data' },
      { name: 'comment:read', resource: 'comments', action: 'read', description: 'Read comments' },
      { name: 'comment:write', resource: 'comments', action: 'write', description: 'Write comments' },
      { name: 'admin:all', resource: 'system', action: 'admin', description: 'Full admin access' },
    ];

    for (const perm of permissions) {
      await prisma.permission.create({ data: perm });
      console.log(`   ✅ Created permission: ${perm.name}`);
    }

    // Create roles
    console.log('👥 Creating roles...');
    const adminRole = await prisma.role.create({
      data: {
        name: 'admin',
        description: 'System administrator',
      }
    });

    const userRole = await prisma.role.create({
      data: {
        name: 'user',
        description: 'Regular user',
      }
    });

    console.log('   ✅ Created roles: admin, user');

    // Create demo users
    console.log('👤 Creating demo users...');
    
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: await bcrypt.hash('admin123', 12),
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        isVerified: true,
      }
    });

    const regularUser = await prisma.user.create({
      data: {
        email: 'user@example.com',
        password: await bcrypt.hash('user123', 12),
        firstName: 'Regular',
        lastName: 'User',
        isActive: true,
        isVerified: true,
      }
    });

    // Assign roles
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      }
    });

    await prisma.userRole.create({
      data: {
        userId: regularUser.id,
        roleId: userRole.id,
      }
    });

    console.log('   ✅ Created demo users:');
    console.log('     - admin@example.com (password: admin123)');
    console.log('     - user@example.com (password: user123)');

    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

simpleSeed()
  .then(() => {
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });