/**
 * Profile TypeScript Interfaces
 *
 * Type definitions for profile-related data structures
 */

import { Session } from './sessions.schema';

// Re-export schema types
export type { Session };

export interface ISession extends Session { }

// Combined profile data interface
export interface IUserProfile {
  // Basic user info (from users table)
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  user_type: string;
  created_at: Date;
  updated_at: Date;
}

// Security settings response
export interface ISecuritySettings {
  activeSessions: any[];
  loginHistory: Array<{
    timestamp: Date;
    ip_address: string;
    location?: string;
    device_type?: string;
    browser?: string;
  }>;
  passwordLastChanged?: string;
  twoFactorEnabled?: boolean;
  twoFactorId?: string;
  twoFactorMethod?: string;
  lastVerified?: string;
}
