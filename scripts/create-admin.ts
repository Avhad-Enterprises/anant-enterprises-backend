/**
 * Admin User Creation Script
 *
 * This script creates an admin user with the following credentials:
 * - Email: admin@gmail.com
 * - Password: 12345678
 * - Name: Admin User
 * - Role: admin
 *
 * Usage:
 * - npm run create-admin
 * - or: npx tsx scripts/create-admin.ts
 *
 * The script will:
 * 1. Create the admin user in Supabase Auth (auth.users)
 * 2. Sync the user to the custom users table
 * 3. Assign admin role via RBAC system
 * 4. If user already exists, ensure they have admin role assigned
 *
 * Prerequisites:
 * - Supabase must be running (local or cloud)
 * - DATABASE_URL environment variable must be set
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 * - RBAC roles must be seeded first (run: npm run db:seed)
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createClient } from '@supabase/supabase-js';
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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { db } from '../src/database';
import { users } from '../src/features/user/shared/user.schema';
import { roles, userRoles } from '../src/features/rbac';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '12345678';
const ADMIN_NAME = 'Admin User';

async function createAdminUser() {
  const dbUrl = getDatabaseUrl();

  console.log('🚀 Starting admin user creation script...');
  console.log(`📍 Environment: ${nodeEnv}`);
  console.log(`📍 Database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  // Create Supabase admin client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL and SERVICE_ROLE_KEY must be set in environment variables\n' +
      'For local Supabase, check .env.dev file'
    );
  }

  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Create database connection
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  const db = drizzle(pool);

  try {
    // Test connection
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connected');

    // Check if admin user already exists in custom users table
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, ADMIN_EMAIL), eq(users.is_deleted, false)))
      .limit(1);

    let userId: string;

    if (existingUser) {
      console.log(`ℹ️  Admin user with email ${ADMIN_EMAIL} already exists in users table`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.name}`);
      userId = existingUser.id;

      // Check their roles via RBAC
      const userRole = await db
        .select({ roleName: roles.name, roleId: roles.id })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.role_id, roles.id))
        .where(eq(userRoles.user_id, existingUser.id))
        .limit(1);

      if (userRole.length > 0) {
        console.log(`   Role: ${userRole[0].roleName}`);
        console.log('✅ Admin user is already properly configured!');
        return;
      } else {
        console.log('⚠️  No role assigned to this user. Assigning admin role...');

        // Get admin role ID
        const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);

        if (!adminRole) {
          throw new Error(
            'Admin role not found in RBAC system.\n' +
            'Please run: npm run db:seed (to seed RBAC roles and permissions)'
          );
        }

        // Assign admin role
        await db
          .insert(userRoles)
          .values({
            user_id: existingUser.id,
            role_id: adminRole.id,
            assigned_by: existingUser.id, // Self-assigned
          })
          .onConflictDoNothing();

        console.log('✅ Admin role assigned successfully!');
        console.log(`   Role: admin`);
        return;
      }
    }

    // Create user in Supabase Auth
    console.log('📝 Creating admin user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: ADMIN_NAME,
        firstName: 'Admin',
        lastName: 'User',
      },
    });

    if (authError) {
      throw new Error(`Failed to create user in Supabase Auth: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('No user returned from Supabase Auth');
    }

    console.log('✅ Admin user created in Supabase Auth');
    console.log(`   Auth ID: ${authData.user.id}`);

    userId = authData.user.id;

    // Create user in custom users table
    console.log('📝 Syncing admin user to users table...');
    const [newUser] = await db
      .insert(users)
      .values({
        id: authData.user.id, // Use Supabase auth ID
        auth_id: authData.user.id,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        email_verified: true,
        email_verified_at: new Date(),
        created_by: authData.user.id, // Self-created
      })
      .returning();

    console.log('✅ Admin user synced to users table');
    console.log(`   ID: ${newUser.id}`);

    // Get admin role ID from RBAC
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);

    if (!adminRole) {
      throw new Error(
        'Admin role not found in RBAC system.\n' +
        'Please run the following commands first:\n' +
        '  1. npm run db:migrate (to create tables)\n' +
        '  2. npm run db:seed (to seed RBAC roles and permissions)'
      );
    }

    // Assign admin role via RBAC
    console.log('📝 Assigning admin role...');
    await db
      .insert(userRoles)
      .values({
        user_id: newUser.id,
        role_id: adminRole.id,
        assigned_by: newUser.id, // Self-assigned
      })
      .onConflictDoNothing();

    console.log('✅ Admin user created successfully!');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: admin (assigned via RBAC)`);
    console.log(`\n📧 You can now login with:`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
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
  .catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
