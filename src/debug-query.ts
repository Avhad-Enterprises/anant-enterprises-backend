
import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { users } from './features/user/shared/user.schema';

const DB_URL_POOLER = process.env.DATABASE_URL; // Port 6543
const DB_URL_DIRECT = DB_URL_POOLER?.replace(':6543', ':5432');

async function testConnection(url: string, label: string) {
    console.log(`\nTesting ${label}...`);
    console.log(`URL: ${url.replace(/:[^:/@]+@/, ':***@')}`); // Hide password

    const pool = new Pool({ connectionString: url });
    const db = drizzle(pool, { logger: false });

    try {
        // Try to run the exact failing query structure
        // select ... from users where auth_id = $1 limit 1
        const dummyAuthId = '3a46cb2a-3c74-4e1c-9341-c1a7529199a9';

        console.log('Running query...');
        const result = await db.select().from(users).where(eq(users.auth_id, dummyAuthId)).limit(1);

        console.log(`✅ Success! Found ${result.length} users.`);
        // console.log(result[0]); 
    } catch (err: any) {
        console.error(`❌ Failed: ${err.message}`);
        // console.error(err);
    } finally {
        await pool.end();
    }
}

async function run() {
    if (!DB_URL_POOLER) {
        console.error('DATABASE_URL is missing');
        return;
    }

    // Test 1: Current Config (Pooler 6543)
    await testConnection(DB_URL_POOLER, 'Transaction Pooler (Port 6543)');

    // Test 2: Direct Connection (Session 5432)
    if (DB_URL_DIRECT && DB_URL_DIRECT !== DB_URL_POOLER) {
        await testConnection(DB_URL_DIRECT, 'Direct Connection (Port 5432)');
    } else {
        console.log('Skipping Direct Test (URL same or invalid)');
    }
}

run();
