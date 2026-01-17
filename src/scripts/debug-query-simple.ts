
import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

const url6543 = process.env.DATABASE_URL;
const url5432 = url6543?.replace(':6543', ':5432');

async function check(url: string | undefined, name: string) {
    if (!url) return;
    console.log(`CHECKING: ${name}`);
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT 1 as val');
        console.log(`${name}: SUCCESS (val=${res.rows[0].val})`);
        client.release();
    } catch (err: any) {
        console.log(`${name}: FAILED - ${err.message}`);
    } finally {
        await pool.end();
    }
}

async function run() {
    await check(url6543, 'PORT 6543');
    await check(url5432, 'PORT 5432');
}

run();
