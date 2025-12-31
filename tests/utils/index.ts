/**
 * Test Utils Index
 *
 * Re-exports all test utility functions and helpers
 */

// App setup helpers
export { default as createTestApp } from './app.helper';
export { createTestApp as createTestAppNamed } from './app.helper';

// Export default app for easy import in tests
export { default } from './app.helper';

// API testing helpers
export { ApiTestHelper } from './api.helper';

// Supabase Auth testing helpers (preferred)
export { SupabaseAuthHelper } from './supabase-auth.helper';

// Legacy auth helpers (deprecated - migrate to SupabaseAuthTestHelper)
export { AuthTestHelper } from './auth.helper';

// Database testing helpers
export { DatabaseTestHelper, dbHelper } from './database.helper';

// Test data factories
export { TestUser, TestDataFactory } from './factories';

// Database migrations for tests
export { runMigrations } from './migrations';

// Supabase Storage testing helpers
export { s3Helper } from './s3.helper';

// Setup utilities
export * from './setup';
