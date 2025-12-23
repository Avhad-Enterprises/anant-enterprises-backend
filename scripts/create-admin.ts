/**
 * Admin User Creation Script
 *
 * This script creates an admin user with the following credentials:
 * - Email: harshal@gmail.com
 * - Password: 12345678
 * - Name: Harshal Admin
 * - Role: admin
 *
 * Usage:
 * - npm run create-admin
 * - or: npx tsx scripts/create-admin.ts
 *
 * The script will:
 * 1. Check if an admin user with this email already exists
 * 2. If not, create the admin user with hashed password
 * 3. If exists, display the existing user details
 *
 * Environment Requirements:
 * - DATABASE_URL environment variable must be set
 * - Database must be running and accessible
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
  dotenv.config({ path: '.env.test' });
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
import { users } from '../src/features/user/shared/schema';
import { roles, userRoles } from '../src/features/rbac/shared/schema';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '12345678';
const ADMIN_NAME = 'Admin User';

async function createAdminUser() {
  const dbUrl = getDatabaseUrl();
  
  console.log('🚀 Starting admin user creation script...');
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

    // Check if admin user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, ADMIN_EMAIL), eq(users.is_deleted, false)))
      .limit(1);

    if (existingUser) {
      console.log(`ℹ️  Admin user with email ${ADMIN_EMAIL} already exists`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.name}`);
      // Check their roles via RBAC
      const userRole = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.role_id, roles.id))
        .where(eq(userRoles.user_id, existingUser.id))
        .limit(1);
      if (userRole.length > 0) {
        console.log(`   Role: ${userRole[0].roleName}`);
      }
      return;
    }

    // Hash the password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

      // Create admin user with self-reference for first admin
    console.log('📝 Creating admin user...');
    
    // Use raw SQL to handle self-referential first user
    const result = await pool.query(`
      INSERT INTO users (name, email, password, created_by)
      VALUES ($1, $2, $3, NULL)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, name, email, created_at
    `, [ADMIN_NAME, ADMIN_EMAIL, hashedPassword]);

    if (result.rows.length === 0) {
      // User already exists (conflict)
      console.log(`ℹ️  Admin user with email ${ADMIN_EMAIL} already exists`);
      return;
    }

    const newUser = result.rows[0];
    
    // Update created_by to self-reference
    await pool.query('UPDATE users SET created_by = $1 WHERE id = $1', [newUser.id]);

    // Get admin role ID from RBAC
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
    
    if (!adminRole) {
      throw new Error('Admin role not found in RBAC system. Please run migrations and seed RBAC data first.');
    }

    // Assign admin role via RBAC
    await db.insert(userRoles).values({
      user_id: newUser.id,
      role_id: adminRole.id,
      assigned_by: newUser.id, // Self-assigned
    }).onConflictDoNothing();

    console.log('✅ Admin user created successfully!');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: admin (assigned via RBAC)`);
    console.log(`   Created at: ${newUser.created_at}`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
