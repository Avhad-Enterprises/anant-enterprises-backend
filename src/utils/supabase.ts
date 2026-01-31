import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from './logging/logger';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;

// Support both new (platform) and legacy (CLI) key formats
// New format: sb_publishable_..., sb_secret_...
// Legacy format: JWT-based anon/service_role keys
const supabasePublicKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || // New format (Supabase Cloud)
  process.env.SUPABASE_ANON_KEY; // Legacy format (Local CLI)

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || // New format (Supabase Cloud)
  process.env.SUPABASE_SERVICE_ROLE_KEY; // Legacy format (Local CLI)

if (!supabaseUrl || !supabasePublicKey || !supabaseSecretKey) {
  throw new Error(
    'Missing Supabase environment variables. Need SUPABASE_URL and either (PUBLISHABLE_KEY + SECRET_KEY) or (ANON_KEY + SERVICE_ROLE_KEY)'
  );
}

/**
 * Service role client - bypasses RLS
 * Use for:
 * - Admin operations
 * - System operations
 * - Operations that need to access all data
 */
export const supabase = createClient(supabaseUrl, supabaseSecretKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Anonymous client - respects RLS
 * Use for:
 * - User operations (authenticated via JWT)
 * - Operations that should respect RLS policies
 */
export const supabaseAnon = createClient(supabaseUrl, supabasePublicKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

logger.info('Supabase clients initialized', {
  url: supabaseUrl,
  hasSecretKey: !!supabaseSecretKey,
  hasPublicKey: !!supabasePublicKey,
  keyType: process.env.SUPABASE_PUBLISHABLE_KEY ? 'new (platform)' : 'legacy (CLI)',
});
