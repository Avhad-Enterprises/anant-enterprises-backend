/**
 * Database Index
 *
 * Re-exports all database-related functionality for convenient imports
 */

// Core database connection and configuration
export {
  pool,
  connectWithRetry,
  schema,
  db,
  closeDatabase
} from './drizzle';

// Database health checks
export type { HealthCheckResult } from './health';
export { checkDatabaseHealth } from './health';

// Database examples and documentation
export * from './examples';

// CLI scripts (typically not imported in application code)
// export * from './migrate';  // CLI script
// export * from './seed';    // CLI script