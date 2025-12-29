/**
 * Test Users Creation Script
 *
 * This script creates test users for the remaining roles:
 * - Scientist: scientist@example.test / scientist123
 * - Researcher: researcher@example.test / researcher123
 * - Policymaker: policymaker@example.test / policymaker123
 *
 * Usage:
 * - npx tsx scripts/create-test-users.ts
 *
 * The script will:
 * 1. Check if test users already exist
 * 2. Create missing test users with hashed passwords
 * 3. Display created user details
 *
 * Environment Requirements:
 * - DATABASE_URL environment variable must be set
 * - Database must be running and accessible
 * - Admin user should exist (created_by reference)
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import bcrypt from 'bcrypt';
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'development') {
  dotenv.config({ path: '.env.dev' });
} else if (nodeEnv === 'production') {
  dotenv.config({ path: '.env.prod' });
} else if (nodeEnv === 'test') {
  dotenv.config({ path: '.env.dev' }); // Use same env as development
}
dotenv.config();

/**
 * Get database URL with Docker hostname converted to localhost
 * Port mapping: dev=5434, test=5433
 */
function getDatabaseUrl(): string {
  let dbUrl = process.env.DATABASE_URL || '';

  if (dbUrl.includes('@postgres:5432')) {
    const hostPort = nodeEnv === 'development' ? 5434 : nodeEnv === 'test' ? 5433 : 5432;
    dbUrl = dbUrl.replace('@postgres:5432', `@localhost:${hostPort}`);
  }

  return dbUrl;
}

// Import schemas after env is configured
import { users } from '../src/features/user';
import { roles, userRoles } from '../src/features/rbac';

const TEST_USERS = [
  {
    name: 'Regular User',
    email: 'user@gmail.com',
    password: '12345678',
    role: 'user' as const,
  },
  {
    name: 'Admin User',
    email: 'admin2@gmail.com',
    password: '12345678',
    role: 'admin' as const,
  },
  {
    name: 'Super Admin User',
    email: 'superadmin@gmail.com',
    password: '12345678',
    role: 'superadmin' as const,
  },
];

async function createTestUsers() {
  const dbUrl = getDatabaseUrl();

  console.log('🚀 Starting test users creation script...');
  console.log(`📍 Environment: ${nodeEnv}`);
  console.log(`📍 Database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  // Create database connection
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  const db = drizzle(pool);

  try {
    // Test connection
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connected');

    // Get admin user ID for created_by reference via RBAC
    const [adminUserRole] = await db
      .select({ user_id: userRoles.user_id })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.role_id, roles.id))
      .where(and(eq(roles.name, 'admin'), eq(roles.is_deleted, false)))
      .limit(1);

    if (!adminUserRole) {
      throw new Error('Admin user not found. Please run create-admin.ts first.');
    }

    const adminUser = { id: adminUserRole.user_id };

    console.log(`👤 Using admin user ID ${adminUser.id} as creator reference`);

    // Process each test user
    for (const userData of TEST_USERS) {
      console.log(`\n📝 Processing ${userData.role} user...`);

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, userData.email), eq(users.is_deleted, false)))
        .limit(1);

      if (existingUser) {
        console.log(`ℹ️  ${userData.role} user with email ${userData.email} already exists`);
        console.log(`   ID: ${existingUser.id}`);
        console.log(`   Name: ${existingUser.name}`);
        continue;
      }

      // Hash the password
      console.log(`🔐 Hashing password for ${userData.role}...`);
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create test user (no role column)
      console.log(`📝 Creating ${userData.role} user...`);

      const result = await pool.query(`
        INSERT INTO users (name, email, password, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, created_at
      `, [userData.name, userData.email, hashedPassword, adminUser.id]);

      const newUser = result.rows[0];

      // Get role ID from RBAC
      const [roleRecord] = await db.select().from(roles).where(eq(roles.name, userData.role)).limit(1);
      
      if (!roleRecord) {
        throw new Error(`Role '${userData.role}' not found in RBAC system. Please run migrations and seed RBAC data first.`);
      }

      // Assign role via RBAC
      await db.insert(userRoles).values({
        user_id: newUser.id,
        role_id: roleRecord.id,
        assigned_by: adminUser.id,
      }).onConflictDoNothing();

      console.log(`✅ ${userData.role} user created successfully!`);
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Role: ${userData.role} (assigned via RBAC)`);
      console.log(`   Created at: ${newUser.created_at}`);
      console.log(`   Login credentials: ${userData.email} / ${userData.password}`);
    }

    console.log('\n🎉 All test users processed successfully!');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createTestUsers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });