// Set test environment FIRST
process.env.NODE_ENV = 'test';

// Load environment from .env.dev (same as development)
import { loadEnv, getDatabaseUrl } from '../../src/utils';
loadEnv();

// Convert Docker hostname to localhost for host-based test runs
process.env.DATABASE_URL = getDatabaseUrl();

// Global test timeout
jest.setTimeout(30000);

// Run migrations before all tests (only once per test run)
beforeAll(async () => {
  const { runMigrations } = await import('./migrations');
  await runMigrations();

  // Seed RBAC data for all tests
  const { SupabaseAuthHelper } = await import('./supabase-auth.helper');
  await SupabaseAuthHelper.seedRBACData();
});
