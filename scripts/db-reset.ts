// Load env FIRST, before any other imports
import { loadEnv } from '../src/utils/loadEnv';
const nodeEnv = loadEnv();

import { Pool } from 'pg';
import { logger } from '../src/utils';
import { getDatabaseUrl, getMaskedDatabaseUrl } from '../src/utils';

/**
 * Complete database reset script
 * This will:
 * 1. Drop all tables
 * 2. Drop all ENUM types
 * 3. Drop all sequences
 * 4. Clean the database completely
 * 
 * Usage: ts-node scripts/db-reset.ts
 */
async function resetDatabase() {
  const connectionString = getDatabaseUrl();

  logger.info(`🔄 Starting complete database reset for ${nodeEnv} environment...`);
  logger.info(`📍 Database: ${getMaskedDatabaseUrl()}`);

  const pool = new Pool({ connectionString, max: 1 });

  try {
    // Drop all tables
    logger.info('🗑️  Dropping all tables...');
    await pool.query(`
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Drop all ENUM types
    logger.info('🗑️  Dropping all ENUM types...');
    await pool.query(`
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT typname FROM pg_type WHERE typcategory = 'E' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Drop all sequences
    logger.info('🗑️  Dropping all sequences...');
    await pool.query(`
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Drop drizzle migrations table
    logger.info('🗑️  Dropping drizzle migrations table...');
    await pool.query(`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;`);

    logger.info('✅ Database reset completed successfully!');
    logger.info('💡 Run "npm run db:generate && npm run db:migrate" to recreate the schema');

  } catch (error) {
    logger.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run reset
resetDatabase();
