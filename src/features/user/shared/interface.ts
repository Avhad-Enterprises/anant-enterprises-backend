/**
 * User Interfaces
 *
 * TypeScript interfaces for user-related types.
 * These are the canonical types for application code.
 *
 * NOTE: Customer, Business, Admin, and Address interfaces are now in their respective feature folders:
 * - customer/shared/interface.ts - ICustomerProfile, IBusinessCustomerProfile, ICustomerStatistics
 * - admin/shared/interface.ts - IAdminProfile
 * - address/shared/interface.ts - IUserAddress, IUserPaymentMethod
 */

// ============================================
// USER
// ============================================

export interface IUser {
  id: string;
  auth_id?: string | null;
  display_id?: string | null; // Human-readable ID: CUST-XXXXXX, EMP-XXXXXX, or USER-XXXXXX (auto-generated)
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  display_name?: string | null;
  email: string;
  password?: string | null;
  email_verified: boolean;
  email_verified_at?: Date | null;
  phone_number?: string | null;
  phone_country_code?: string | null;
  phone_verified: boolean;
  phone_verified_at?: Date | null;
  secondary_email?: string | null;
  secondary_email_verified?: boolean;
  secondary_phone_number?: string | null;
  profile_image_url?: string | null;
  date_of_birth?: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  tags?: string[] | null;
  metadata?: unknown;
  preferred_language: string;
  languages?: string[] | null;
  preferred_currency: string;
  timezone: string;
  created_by?: string | null;
  created_at: Date;
  updated_by?: string | null;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: string | null;
  deleted_at?: Date | null;
}

