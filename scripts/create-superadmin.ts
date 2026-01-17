console.log("STARTING SCRIPT...");
import dotenv from 'dotenv';
import path from 'path';

console.log("CWD:", process.cwd());

const nodeEnv = process.env.NODE_ENV || 'development';
console.log("NODE_ENV:", nodeEnv);

// Force load .env.dev from CWD
const envPath = path.resolve(process.cwd(), '.env.dev');
console.log("Loading env from:", envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.log("Error loading .env.dev:", result.error.message);
} else {
    console.log("Loaded .env.dev successfully");
    // Verify vars
    console.log("SUPABASE_URL set?", !!process.env.SUPABASE_URL);
}

// Check if we need to fall back or load others
if (process.env.NODE_ENV === 'production') {
    // ...
}

import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createClient } from '@supabase/supabase-js';

// We need to set DATABASE_URL properly if it's not set
if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found in env!");
}

function getDatabaseUrl(): string {
    let dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('@postgres:5432')) {
        const hostPort = nodeEnv === 'development' ? 5434 : nodeEnv === 'test' ? 5433 : 5432;
        dbUrl = dbUrl.replace('@postgres:5432', `@localhost:${hostPort}`);
    }
    return dbUrl;
}

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '12345678';
const ADMIN_NAME = 'Super Admin User';

async function createSuperAdminUser() {
    console.log("Inside createSuperAdminUser");

    // Dynamic import to ensure env is loaded
    const { supabase } = await import('../src/utils/supabase');
    const { users } = await import('../src/features/user/shared/user.schema');
    const { roles, userRoles } = await import('../src/features/rbac');

    const dbUrl = getDatabaseUrl();

    console.log(`📍 Database: ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'UNDEFINED'}`);

    if (!dbUrl) {
        throw new Error("DATABASE_URL is missing!");
    }

    const pool = new Pool({ connectionString: dbUrl, max: 1 });
    const db = drizzle(pool);

    try {
        console.log('🔄 Connecting to database...');
        const client = await pool.connect();
        client.release();
        console.log('✅ Database connected');

        // Check if user exists
        const [existingUser] = await db
            .select()
            .from(users)
            .where(and(eq(users.email, ADMIN_EMAIL), eq(users.is_deleted, false)))
            .limit(1);

        let userId: string;

        if (existingUser) {
            console.log(`ℹ️  User with email ${ADMIN_EMAIL} already exists`);
            userId = existingUser.id;

            // Update info
            console.log('📝 Updating user info...');
            await db.update(users).set({
                name: ADMIN_NAME,
                email_verified: true,
                email_verified_at: new Date()
            }).where(eq(users.id, userId));

        } else {
            // Create user in Supabase Auth
            console.log('📝 Creating user in Supabase Auth...');
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    name: ADMIN_NAME,
                    firstName: 'Super',
                    lastName: 'Admin',
                },
            });

            if (authError) {
                console.log("Got auth error:", authError.message);
                if (authError.message.includes("already registered") || authError.message.includes("unique constraint")) {
                    console.log("ℹ️ User exists in Supabase. Fetching...");
                    const { data: { users: existingAuthUsers } } = await supabase.auth.admin.listUsers();
                    const authUser = existingAuthUsers.find(u => u.email === ADMIN_EMAIL);
                    if (authUser) {
                        userId = authUser.id;
                        console.log('📝 Syncing Supabase user to users table...');
                        const [newUser] = await db.insert(users).values({
                            id: authUser.id,
                            auth_id: authUser.id,
                            email: ADMIN_EMAIL,
                            name: ADMIN_NAME,
                            email_verified: true,
                            email_verified_at: new Date(),
                            created_by: authUser.id,
                        }).onConflictDoUpdate({
                            target: users.id,
                            set: { is_deleted: false, name: ADMIN_NAME }
                        }).returning();
                        userId = newUser.id;
                    } else {
                        throw new Error("User reported as existing but could not be found.");
                    }
                } else {
                    throw new Error(`Failed to create user in Supabase Auth: ${authError.message}`);
                }
            } else if (authData.user) {
                userId = authData.user.id;
                // Create user in custom users table
                console.log('📝 Syncing admin user to users table...');
                const [newUser] = await db
                    .insert(users)
                    .values({
                        id: authData.user.id,
                        auth_id: authData.user.id,
                        email: ADMIN_EMAIL,
                        name: ADMIN_NAME,
                        email_verified: true,
                        email_verified_at: new Date(),
                        created_by: authData.user.id,
                    })
                    .returning();
                userId = newUser.id;
            } else {
                throw new Error("Unexpected state: No user returned and no error.");
            }
        }

        // Now assign SUPERADMIN role
        console.log('SEARCHING FOR SUPERADMIN role...');
        const [superAdminRole] = await db.select().from(roles).where(eq(roles.name, 'superadmin')).limit(1);

        if (!superAdminRole) {
            throw new Error('Superadmin role not found! Run db:seed first.');
        }

        console.log('📝 Assigning superadmin role...');
        await db
            .insert(userRoles)
            .values({
                user_id: userId!,
                role_id: superAdminRole.id,
                assigned_by: userId!, // Self-assigned
            })
            .onConflictDoNothing();

        if (existingUser || userId) {
            console.log('🔐 Updating password...');
            const { error: pwdError } = await supabase.auth.admin.updateUserById(
                userId!,
                { password: ADMIN_PASSWORD }
            );
            if (pwdError) {
                console.error("Failed to update password:", pwdError);
            } else {
                console.log("✅ Password updated to " + ADMIN_PASSWORD);
            }
        }

        console.log('✅ Super Admin configured successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

createSuperAdminUser()
    .then(() => {
        console.log("DONE");
        process.exit(0);
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
