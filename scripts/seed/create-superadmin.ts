import { logger } from '../../src/utils';

logger.info("STARTING SCRIPT...");
import dotenv from 'dotenv';
import path from 'path';

logger.info("CWD:", process.cwd());

const nodeEnv = process.env.NODE_ENV || 'development';
logger.info("NODE_ENV:", nodeEnv);

// Force load .env.dev from CWD
const envPath = path.resolve(process.cwd(), '.env.dev');
logger.info("Loading env from:", envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    logger.error("Error loading .env.dev:", result.error.message);
} else {
    logger.info("Loaded .env.dev successfully");
    // Verify vars
    logger.info("SUPABASE_URL set?", !!process.env.SUPABASE_URL);
}

// Check if we need to fall back or load others
if (process.env.NODE_ENV === 'production') {
    // ...
}

import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

// We need to set DATABASE_URL properly if it's not set
if (!process.env.DATABASE_URL) {
    logger.error("DATABASE_URL not found in env!");
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
    logger.info("Inside createSuperAdminUser");

    // Dynamic import to ensure env is loaded
    const { supabase } = await import('../../src/utils/supabase');
    const { users } = await import('../../src/features/user/shared/user.schema');
    const { roles, userRoles } = await import('../../src/features/rbac');

    const dbUrl = getDatabaseUrl();

    logger.info(`📍 Database: ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'UNDEFINED'}`);

    if (!dbUrl) {
        throw new Error("DATABASE_URL is missing!");
    }

    const pool = new Pool({ connectionString: dbUrl, max: 1 });
    const db = drizzle(pool);

    try {
        logger.info('🔄 Connecting to database...');
        const client = await pool.connect();
        client.release();
        logger.info('✅ Database connected');

        // Check if user exists
        const [existingUser] = await db
            .select()
            .from(users)
            .where(and(eq(users.email, ADMIN_EMAIL), eq(users.is_deleted, false)))
            .limit(1);

        let userId: string;

        if (existingUser) {
            logger.info(`ℹ️  User with email ${ADMIN_EMAIL} already exists`);
            userId = existingUser.id;

            // Update info
            logger.info('📝 Updating user info...');
            await db.update(users).set({
                first_name: 'Super Admin',
                last_name: 'User',
                email_verified: true,
                email_verified_at: new Date()
            }).where(eq(users.id, userId));

        } else {
            // Create user in Supabase Auth
            logger.info('📝 Creating user in Supabase Auth...');
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
                logger.warn("Auth creation error (checking if user exists):", authError.message);
                // Try to see if user already exists regardless of error message
                const { data: { users: existingAuthUsers } } = await supabase.auth.admin.listUsers();
                const authUser = (existingAuthUsers as any[]).find(u => u.email === ADMIN_EMAIL);

                if (authUser) {
                    userId = authUser.id;
                    logger.info('ℹ️ User exists in Supabase. Syncing to users table...');
                    const [newUser] = await db.insert(users).values({
                        id: authUser.id,
                        auth_id: authUser.id,
                        email: ADMIN_EMAIL,
                        first_name: 'Super Admin',
                        last_name: 'User',
                        email_verified: true,
                        email_verified_at: new Date(),
                        created_by: authUser.id,
                    }).onConflictDoUpdate({
                        target: users.id,
                        set: { is_deleted: false, first_name: 'Super Admin', last_name: 'User' }
                    }).returning();
                    userId = newUser.id;
                } else {
                    throw new Error(`Failed to create user and could not find them in list: ${authError.message}`);
                }
            } else if (authData.user) {
                userId = authData.user.id;
                // Create user in custom users table
                logger.info('📝 Syncing admin user to users table...');
                const [newUser] = await db
                    .insert(users)
                    .values({
                        id: authData.user.id,
                        auth_id: authData.user.id,
                        email: ADMIN_EMAIL,
                        first_name: 'Super Admin',
                        last_name: 'User',
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
        logger.info('SEARCHING FOR SUPERADMIN role...');
        const [superAdminRole] = await db.select().from(roles).where(eq(roles.name, 'superadmin')).limit(1);

        if (!superAdminRole) {
            throw new Error('Superadmin role not found! Run db:seed first.');
        }

        logger.info('📝 Assigning superadmin role...');
        await db
            .insert(userRoles)
            .values({
                user_id: userId!,
                role_id: superAdminRole.id,
                assigned_by: userId!, // Self-assigned
            })
            .onConflictDoNothing();

        if (existingUser || userId) {
            logger.info('🔐 Updating password...');
            const { error: pwdError } = await supabase.auth.admin.updateUserById(
                userId!,
                { password: ADMIN_PASSWORD }
            );
            if (pwdError) {
                logger.error("Failed to update password:", pwdError);
            } else {
                logger.info("✅ Password updated to " + ADMIN_PASSWORD);
            }
        }

        logger.info('✅ Super Admin configured successfully!');

    } catch (error) {
        logger.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

createSuperAdminUser()
    .then(() => {
        logger.info("DONE");
        process.exit(0);
    })
    .catch((e) => {
        logger.error(e);
        process.exit(1);
    });
