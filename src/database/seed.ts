import dotenv from 'dotenv';
dotenv.config();

import { db, closeDatabase } from './drizzle';
import { users } from '../features/user';
import { uploads } from '../features/upload';
import { userRoles, roles } from '../features/rbac';
import { seedRBAC } from '../features/rbac';
import { logger } from '../utils';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

/**
 * Seed database with initial data
 * 
 * This script seeds the database with:
 * 1. RBAC roles and permissions (user, admin, superadmin)
 * 2. Test users with appropriate role assignments
 * 3. Sample uploads for testing
 * 
 * Prerequisites:
 * - Database must be running and accessible
 * - Migrations must be applied (run: npm run db:migrate)
 * 
 * Usage:
 * - npm run db:seed
 * - or: ts-node src/database/seed.ts
 * 
 * Note: This seed script is idempotent - it can be run multiple times safely
 * It will skip creating data that already exists
 */
async function seed() {
  try {
    logger.info('🌱 Starting database seeding...');

    // 1. Seed RBAC data first (roles and permissions)
    logger.info('📋 Seeding RBAC roles and permissions...');
    await seedRBAC();

    // 2. Check if users already exist
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length > 0) {
      logger.info('ℹ️  Users already exist. Skipping user seeding...');
      logger.info('🎉 Database seeding completed successfully!');
      return;
    }

    // 3. Get role IDs from RBAC system
    logger.info('🔍 Fetching role IDs from RBAC system...');
    const [userRole] = await db.select().from(roles).where(eq(roles.name, 'user'));
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin'));
    const [superadminRole] = await db.select().from(roles).where(eq(roles.name, 'superadmin'));

    if (!userRole || !adminRole || !superadminRole) {
      throw new Error(
        'RBAC roles not found. This should not happen after seedRBAC() succeeds.\n' +
        'Please check the RBAC seed function.'
      );
    }

    // 4. Create test users with proper password hashing
    logger.info('👥 Creating test users...');
    const hashedPassword = await bcrypt.hash('12345678', 10);

    // Create users in a way that handles self-referential created_by
    const testUserData = {
      name: 'Test User',
      email: 'user@gmail.com',
      password: hashedPassword,
      phone_number: '+1234567890',
      created_by: null as number | null, // Will be set after creation
    };

    const adminUserData = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      phone_number: '+1234567891',
      created_by: null as number | null,
    };

    const superadminUserData = {
      name: 'Super Admin',
      email: 'superadmin@gmail.com',
      password: hashedPassword,
      phone_number: '+1234567892',
      created_by: null as number | null,
    };

    // Insert users
    const createdUsers = await db
      .insert(users)
      .values([testUserData, adminUserData, superadminUserData])
      .returning();

    logger.info(`✅ Created ${createdUsers.length} test users`);

    // Update created_by to self-reference (optional, for consistency)
    const testUser = createdUsers.find((u) => u.email === 'user@gmail.com')!;
    const adminUser = createdUsers.find((u) => u.email === 'admin@example.com')!;
    const superadminUser = createdUsers.find((u) => u.email === 'superadmin@gmail.com')!;

    await db.update(users).set({ created_by: testUser.id }).where(eq(users.id, testUser.id));
    await db.update(users).set({ created_by: adminUser.id }).where(eq(users.id, adminUser.id));
    await db.update(users).set({ created_by: superadminUser.id }).where(eq(users.id, superadminUser.id));

    // 5. Assign roles to users via RBAC
    logger.info('🔐 Assigning roles to users...');
    await db.insert(userRoles).values([
      { user_id: testUser.id, role_id: userRole.id, assigned_by: testUser.id },
      { user_id: adminUser.id, role_id: adminRole.id, assigned_by: adminUser.id },
      { user_id: superadminUser.id, role_id: superadminRole.id, assigned_by: superadminUser.id },
    ]);

    logger.info('✅ Assigned roles to users');
    logger.info(`   - ${testUser.email} → user role`);
    logger.info(`   - ${adminUser.email} → admin role`);
    logger.info(`   - ${superadminUser.email} → superadmin role`);

    // 6. Create test uploads
    logger.info('📁 Creating test uploads...');
    await db.insert(uploads).values([
      {
        user_id: testUser.id,
        filename: 'test-image-1.jpg',
        original_filename: 'original-test-image.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024000,
        file_path: '/uploads/test-image-1.jpg',
        file_url: 'https://example.com/uploads/test-image-1.jpg',
        status: 'completed',
        created_by: testUser.id,
      },
      {
        user_id: testUser.id,
        filename: 'document.pdf',
        original_filename: 'important-document.pdf',
        mime_type: 'application/pdf',
        file_size: 2048000,
        file_path: '/uploads/document.pdf',
        file_url: 'https://example.com/uploads/document.pdf',
        status: 'completed',
        created_by: testUser.id,
      },
    ]);

    logger.info('✅ Created 2 test uploads');

    logger.info('\n🎉 Database seeding completed successfully!');
    logger.info('\n📋 Test users created:');
    logger.info(`   - user@gmail.com / 12345678 (role: user)`);
    logger.info(`   - admin@example.com / 12345678 (role: admin)`);
    logger.info(`   - superadmin@gmail.com / 12345678 (role: superadmin)`);
    logger.info('\n💡 Tip: Use npm run create-admin to create admin@gmail.com');
    logger.info('💡 Tip: Use npm run create-test-users for more test users');

  } catch (error) {
    logger.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

// Run seed function
seed();
