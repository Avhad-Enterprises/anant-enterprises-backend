import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.dev') });

async function checkSchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Supabase usually requires SSL
  });

  try {
    await client.connect();
    console.log('Connected to DB.');
    console.log('Checking blogs table schema...');

    // Query to get column names for 'blogs' table
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blogs';
    `);

    console.log('Columns found:', result.rows.map(r => r.column_name));

    // Check if is_deleted exists
    const hasIsDeleted = result.rows.some((row: any) => row.column_name === 'is_deleted');

    if (hasIsDeleted) {
      console.log('SUCCESS: is_deleted column exists.');
      process.exit(0);
    } else {
      console.error('FAILURE: is_deleted column MISSING.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkSchema();
