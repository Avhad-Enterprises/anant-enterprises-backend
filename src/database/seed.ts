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
 * This is useful for development and testing
 */
async function seed() {
  try {
    logger.info('🌱 Starting database seeding...');

    // 1. Seed RBAC data first (roles and permissions)
    await seedRBAC();

    // Check if users already exist
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length > 0) {
      logger.info('Users already exist. Skipping user seeding...');
    } else {
      // Create test users
      logger.info('Creating test users...');
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

      const createdUsers = await db
        .insert(users)
        .values([
          {
            name: 'Test User',
            email: 'test@example.com',
            password: hashedPassword,
            phone_number: '+1234567890',
            created_by: 1,
          },
          {
            name: 'Admin User',
            email: 'admin@example.com',
            password: hashedPassword,
            phone_number: '+1234567891',
            created_by: 1,
          },
          {
            name: 'Super Admin',
            email: 'superadmin@example.com',
            password: hashedPassword,
            phone_number: '+1234567892',
            created_by: 1,
          },
        ])
        .returning();

      logger.info(`✅ Created ${createdUsers.length} test users`);

      // Assign roles to users
      const [userRole] = await db.select().from(roles).where(eq(roles.name, 'user'));
      const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin'));
      const [superadminRole] = await db.select().from(roles).where(eq(roles.name, 'superadmin'));

      const testUser = createdUsers.find((u) => u.email === 'test@example.com')!;
      const adminUser = createdUsers.find((u) => u.email === 'admin@example.com')!;
      const superadminUser = createdUsers.find((u) => u.email === 'superadmin@example.com')!;

      await db.insert(userRoles).values([
        { user_id: testUser.id, role_id: userRole.id },
        { user_id: adminUser.id, role_id: adminRole.id },
        { user_id: superadminUser.id, role_id: superadminRole.id },
      ]);

      logger.info('✅ Assigned roles to users');

      // Create test uploads
      logger.info('Creating test uploads...');
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

      logger.info(`✅ Created ${2} test uploads`);
    }

    logger.info('🎉 Database seeding completed successfully!');
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

