
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// Load env vars
dotenv.config({ path: '.env.dev' });

async function resetTestDb() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL is not defined in .env.dev');
        process.exit(1);
    }

    console.log(`Using Database: ${dbUrl}`);

    const pool = new Pool({ connectionString: dbUrl });
    const db = drizzle(pool);

    try {
        console.log('🗑️  Dropping public schema...');
        await pool.query('DROP SCHEMA public CASCADE;');

        console.log('✨ Recreating public schema...');
        await pool.query('CREATE SCHEMA public;');
        await pool.query('GRANT ALL ON SCHEMA public TO public;'); // or specific user

        console.log('🔄 Running migrations...');
        await migrate(db, { migrationsFolder: './src/database/migrations' });

        console.log('✅ Test database reset and migrated successfully!');
    } catch (error) {
        console.error('❌ Failed to reset database:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

resetTestDb();
