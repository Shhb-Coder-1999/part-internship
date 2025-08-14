import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding user management database...');

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full access',
      permissions: JSON.stringify({
        users: ['create', 'read', 'update', 'delete'],
        roles: ['create', 'read', 'update', 'delete'],
        system: ['read', 'update']
      })
    }
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Regular user with basic access',
      permissions: JSON.stringify({
        profile: ['read', 'update'],
        comments: ['create', 'read', 'update', 'delete']
      })
    }
  });

  const moderatorRole = await prisma.role.upsert({
    where: { name: 'moderator' },
    update: {},
    create: {
      name: 'moderator',
      description: 'Moderator with content management access',
      permissions: JSON.stringify({
        users: ['read', 'update'],
        comments: ['create', 'read', 'update', 'delete'],
        moderation: ['read', 'update']
      })
    }
  });

  console.log('✅ Roles created:', [adminRole.name, userRole.name, moderatorRole.name]);

  // Create admin user
  const hashedAdminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedAdminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
      isVerified: true
    }
  });

  // Create regular user
  const hashedUserPassword = await bcrypt.hash('user123', 12);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'user',
      password: hashedUserPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      isActive: true,
      isVerified: true
    }
  });

  // Create moderator user
  const hashedModPassword = await bcrypt.hash('mod123', 12);
  const moderatorUser = await prisma.user.upsert({
    where: { email: 'moderator@example.com' },
    update: {},
    create: {
      email: 'moderator@example.com',
      username: 'moderator',
      password: hashedModPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1234567891',
      isActive: true,
      isVerified: true
    }
  });

  console.log('✅ Users created:', [adminUser.email, regularUser.email, moderatorUser.email]);

  // Assign roles to users
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: regularUser.id,
        roleId: userRole.id
      }
    },
    update: {},
    create: {
      userId: regularUser.id,
      roleId: userRole.id
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: moderatorUser.id,
        roleId: moderatorRole.id
      }
    },
    update: {},
    create: {
      userId: moderatorUser.id,
      roleId: moderatorRole.id
    }
  });

  console.log('✅ User roles assigned successfully');

  console.log('\n🎉 User management database seeded successfully!');
  console.log(`👥 Total users: 3`);
  console.log(`🔒 Total roles: 3`);
  console.log(`🔗 Total user-role assignments: 3`);
  console.log('\n📝 Test credentials:');
  console.log('   Admin: admin@example.com / admin123');
  console.log('   User: user@example.com / user123');
  console.log('   Moderator: moderator@example.com / mod123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding user management database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });