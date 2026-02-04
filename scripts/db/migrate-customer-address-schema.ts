/**
 * Manual Database Migration Script
 * 
 * Target: user_addresses and customer_profiles tables
 * Purpose: 
 *   1. user_addresses: Implement Label vs Role pattern
 *   2. customer_profiles: Change segment to segments (array)
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const nodeEnv = process.env.NODE_ENV || 'development';
const envPath = nodeEnv === 'development' ? '.env.dev' : '.env.prod';
dotenv.config({ path: envPath });
dotenv.config(); // Fallback to .env

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

async function runMigration() {
  console.log(`🚀 Starting manual migration for ${nodeEnv} environment...`);
 

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ============================================
    // 1. user_addresses Table Changes
    // ============================================
    console.log('--- Migrating user_addresses ---');

    // Create address_label enum if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE address_label AS ENUM ('home', 'office', 'warehouse', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add new columns
    await client.query(`
      ALTER TABLE user_addresses 
      ADD COLUMN IF NOT EXISTS address_label address_label DEFAULT 'home' NOT NULL,
      ADD COLUMN IF NOT EXISTS is_default_shipping BOOLEAN DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS is_default_billing BOOLEAN DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
    `);

    // Migrate data from old address_type to address_label
    // Map: shipping -> home, company -> office, other -> other, billing -> home (fallback)
    await client.query(`
      UPDATE user_addresses 
      SET address_label = CASE 
        WHEN address_type::text = 'shipping' THEN 'home'::address_label
        WHEN address_type::text = 'company' THEN 'office'::address_label
        WHEN address_type::text = 'other' THEN 'other'::address_label
        ELSE 'home'::address_label
      END
      WHERE address_label = 'home';
    `);

    // Migrate data from is_default and address_type to is_default_shipping/billing
    await client.query(`
      UPDATE user_addresses 
      SET 
        is_default_shipping = CASE 
          WHEN is_default = true AND address_type::text IN ('shipping', 'both') THEN true 
          ELSE false 
        END,
        is_default_billing = CASE 
          WHEN is_default = true AND address_type::text IN ('billing', 'both') THEN true 
          ELSE false 
        END;
    `);

    // Clean up old columns and types (optional, but requested for alignment)
    // We'll drop constraints first if we were going to drop columns, but let's keep it safe for now 
    // and just drop the column if it exists.
    
    // Drop the old index if it exists
    await client.query(`DROP INDEX IF EXISTS user_addresses_unique_default_idx;`);

    // Add new indexes
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_default_shipping_idx 
      ON user_addresses (user_id) 
      WHERE is_default_shipping = true AND is_deleted = false;

      CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_default_billing_idx 
      ON user_addresses (user_id) 
      WHERE is_default_billing = true AND is_deleted = false;
    `);

    // ============================================
    // 2. customer_profiles Table Changes
    // ============================================
    console.log('--- Migrating customer_profiles ---');

    // Add segments array column
    await client.query(`
      ALTER TABLE customer_profiles 
      ADD COLUMN IF NOT EXISTS segments text[] DEFAULT ARRAY['new']::text[] NOT NULL;
    `);

    // Migrate data from segment to segments
    await client.query(`
      UPDATE customer_profiles 
      SET segments = ARRAY[segment::text]
      WHERE segments = ARRAY['new']::text[];
    `);

    // Drop old index
    await client.query(`DROP INDEX IF EXISTS customer_profiles_segment_idx;`);

    // Add new index
    await client.query(`
      CREATE INDEX IF NOT EXISTS customer_profiles_segments_idx ON customer_profiles USING GIN (segments);
    `);

    await client.query('COMMIT');
    console.log('✨ Migration committed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed and was rolled back:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
