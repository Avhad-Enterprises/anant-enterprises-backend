import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.dev') });

async function fixSchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected. Attempting to add is_deleted column...');

    // Check if column exists first to avoid error
    const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blogs' AND column_name = 'is_deleted';
    `);

    if (checkRes.rows.length === 0) {
      await client.query(`
        ALTER TABLE blogs 
        ADD COLUMN is_deleted boolean DEFAULT false NOT NULL;
      `);
      console.log('SUCCESS: Added is_deleted column.');
    } else {
      console.log('INFO: Column already exists (unexpected based on previous check).');
    }
  } catch (error) {
    console.error('Error fixing schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixSchema();
