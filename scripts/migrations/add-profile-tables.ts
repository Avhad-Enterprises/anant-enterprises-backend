/**
 * Migration: Add Profile Tables
 * 
 * Creates tables for:
 * - profile_settings (user UI/UX preferences)
 * - notification_preferences (user notification settings)
 * - sessions (active user sessions for security)
 * 
 * Run with: npx tsx scripts/migrations/add-profile-tables.ts
 */

import { pool } from '../../src/database';

const createProfileTables = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting migration: Add Profile Tables...');

    await client.query('BEGIN');

    // 1. Create profile_settings table
    console.log('Creating profile_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        
        -- Localization
        timezone VARCHAR(100) DEFAULT 'Eastern Time (ET)',
        preferred_language VARCHAR(50) DEFAULT 'English (US)',
        date_time_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
        
        -- Appearance
        theme VARCHAR(20) DEFAULT 'light',
        density VARCHAR(20) DEFAULT 'comfortable',
        default_landing_page VARCHAR(100) DEFAULT 'Dashboard',
        
        -- Table preferences
        rows_per_page INTEGER DEFAULT 25,
        remember_filters BOOLEAN DEFAULT true,
        
        -- Audit
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS profile_settings_user_id_idx 
      ON profile_settings(user_id);
    `);

    // 2. Create notification_preferences table
    console.log('Creating notification_preferences table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        
        -- Channel preferences
        email_notifications BOOLEAN DEFAULT true,
        sms_notifications BOOLEAN DEFAULT false,
        push_notifications BOOLEAN DEFAULT true,
        
        -- Category preferences
        order_updates BOOLEAN DEFAULT true,
        product_updates BOOLEAN DEFAULT true,
        inventory_alerts BOOLEAN DEFAULT true,
        marketing_emails BOOLEAN DEFAULT false,
        security_alerts BOOLEAN DEFAULT true,
        
        -- Audit
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS notification_preferences_user_id_idx 
      ON notification_preferences(user_id);
    `);

    // 3. Create sessions table
    console.log('Creating sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Session info
        session_token VARCHAR(255) NOT NULL UNIQUE,
        
        -- Device & browser info
        device_type VARCHAR(50),
        browser VARCHAR(100),
        operating_system VARCHAR(100),
        
        -- Location info
        ip_address INET,
        location VARCHAR(200),
        
        -- Activity tracking
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(session_token);
      CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS sessions_last_active_idx ON sessions(last_active);
    `);

    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!');
    console.log('  - profile_settings table created');
    console.log('  - notification_preferences table created');
    console.log('  - sessions table created');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
createProfileTables()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
