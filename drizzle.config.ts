import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'development') {
  dotenv.config({ path: '.env.dev' });
} else if (nodeEnv === 'production') {
  dotenv.config({ path: '.env.prod' });
} else if (nodeEnv === 'test') {
  dotenv.config({ path: '.env.dev' }); // Use same env as development
}
dotenv.config();

/**
 * Get database URL from environment
 */
function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || '';
}

export default defineConfig({
  schema: './src/features/**/shared/*schema.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});
