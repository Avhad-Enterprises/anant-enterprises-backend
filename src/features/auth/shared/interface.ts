/**
 * Auth Shared Interfaces
 *
 * Common interfaces used across the auth feature
 */

/**
 * User data for syncing to public.users table
 */
export interface SyncUserData {
  email: string;
  name?: string;
  phone_number?: string;
}

/**
 * Auth response from Supabase
 */
export interface AuthResponse {
  data: unknown;
  error: unknown;
}
