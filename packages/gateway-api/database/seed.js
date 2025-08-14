/**
 * Gateway Database Seeding
 * Sets up initial roles, permissions, and demo users
 */

import { db } from './client.js';
import { UserService } from './userService.js';

const userService = new UserService();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await db.connect();
    const prisma = db.getClient();

    // Check if already seeded
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log('📋 Database already seeded, skipping...');
      return;
    }

    // Seed permissions
    console.log('🔐 Creating permissions...');
    const permissions = [
      // System permissions
      { name: 'system:admin', resource: 'system', action: 'admin', description: 'Full system administration' },
      { name: 'system:read', resource: 'system', action: 'read', description: 'Read system information' },
      
      // User permissions
      { name: 'users:read', resource: 'users', action: 'read', description: 'Read user information' },
      { name: 'users:write', resource: 'users', action: 'write', description: 'Create and update users' },
      { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
      { name: 'users:admin', resource: 'users', action: 'admin', description: 'Full user administration' },
      
      // Comments permissions
      { name: 'comments:read', resource: 'comments', action: 'read', description: 'Read comments' },
      { name: 'comments:write', resource: 'comments', action: 'write', description: 'Create and update comments' },
      { name: 'comments:delete', resource: 'comments', action: 'delete', description: 'Delete comments' },
      { name: 'comments:moderate', resource: 'comments', action: 'moderate', description: 'Moderate comments' },
      
      // Profile permissions
      { name: 'profile:read', resource: 'profile', action: 'read', description: 'Read own profile' },
      { name: 'profile:write', resource: 'profile', action: 'write', description: 'Update own profile' },
      
      // Gateway permissions
      { name: 'gateway:health', resource: 'gateway', action: 'health', description: 'Access gateway health checks' },
      { name: 'gateway:metrics', resource: 'gateway', action: 'metrics', description: 'Access gateway metrics' },
    ];

    const createdPermissions = {};
    for (const perm of permissions) {
      const permission = await prisma.permission.create({ data: perm });
      createdPermissions[perm.name] = permission;
      console.log(`   ✅ Created permission: ${perm.name}`);
    }

    // Seed roles
    console.log('👥 Creating roles...');
    const roles = [
      {
        name: 'admin',
        description: 'System administrator with full access',
        permissions: [
          'system:admin',
          'users:admin',
          'comments:moderate',
          'profile:read',
          'profile:write',
          'gateway:health',
          'gateway:metrics',
        ]
      },
      {
        name: 'moderator',
        description: 'Content moderator with limited administrative access',
        permissions: [
          'users:read',
          'comments:read',
          'comments:write',
          'comments:moderate',
          'profile:read',
          'profile:write',
        ]
      },
      {
        name: 'user',
        description: 'Regular user with basic access',
        permissions: [
          'comments:read',
          'comments:write',
          'profile:read',
          'profile:write',
        ]
      },
      {
        name: 'guest',
        description: 'Guest user with read-only access',
        permissions: [
          'comments:read',
          'profile:read',
        ]
      }
    ];

    const createdRoles = {};
    for (const roleData of roles) {
      // Create role
      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
        }
      });
      createdRoles[roleData.name] = role;
      console.log(`   ✅ Created role: ${roleData.name}`);

      // Assign permissions to role
      for (const permissionName of roleData.permissions) {
        const permission = createdPermissions[permissionName];
        if (permission) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id,
            }
          });
          console.log(`     🔗 Assigned permission ${permissionName} to ${roleData.name}`);
        }
      }
    }

    // Seed demo users
    console.log('👤 Creating demo users...');
    
    // Admin user
    const adminUser = await userService.createUser({
      email: 'admin@example.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin']
    });
    console.log(`   ✅ Created admin user: ${adminUser.email}`);

    // Regular user
    const regularUser = await userService.createUser({
      email: 'user@example.com', 
      password: 'user123',
      firstName: 'Regular',
      lastName: 'User',
      roles: ['user']
    });
    console.log(`   ✅ Created regular user: ${regularUser.email}`);

    // Moderator user
    const moderatorUser = await userService.createUser({
      email: 'moderator@example.com',
      password: 'moderator123', 
      firstName: 'Moderator',
      lastName: 'User',
      roles: ['moderator']
    });
    console.log(`   ✅ Created moderator user: ${moderatorUser.email}`);

    // Guest user
    const guestUser = await userService.createUser({
      email: 'guest@example.com',
      password: 'guest123',
      firstName: 'Guest',
      lastName: 'User', 
      roles: ['guest']
    });
    console.log(`   ✅ Created guest user: ${guestUser.email}`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('User: user@example.com / user123');
    console.log('Moderator: moderator@example.com / moderator123');
    console.log('Guest: guest@example.com / guest123');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await db.disconnect();
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedDatabase;