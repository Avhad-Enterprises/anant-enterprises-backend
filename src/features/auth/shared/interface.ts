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
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset with token
 */
export interface PasswordReset {
  token: string;
  password: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Auth response from Supabase
 */
export interface AuthResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
}
