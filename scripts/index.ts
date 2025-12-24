/**
 * Scripts Index
 *
 * CLI scripts for database management and user creation
 * These are typically run directly, not imported
 */

// Admin user creation script
// Usage: npx ts-node scripts/create-admin.ts
export * from './create-admin';

// Test user creation script
// Usage: npx ts-node scripts/create-test-users.ts
export * from './create-test-users';