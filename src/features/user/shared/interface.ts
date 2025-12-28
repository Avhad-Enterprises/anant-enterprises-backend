/**
 * IUser Interface - Core authentication data only
 * For profile data, use IUserProfile or IAdminProfile
 * For roles, use RBAC userRoles junction table
 */
export interface IUser {
  id: number;
  email: string;
  phone_number: string | null;
  password_hash: string | null;
  email_verified: boolean;
  email_verified_at: Date | null;
  phone_verified: boolean;
  phone_verified_at: Date | null;
  otp_code: string | null;
  otp_expires_at: Date | null;
  reset_token_hash: string | null;
  reset_expires_at: Date | null;
  account_status: 'pending' | 'active' | 'inactive' | 'banned' | 'locked';
  last_login_at: Date | null;
  last_login_ip: string | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  created_by: number | null;
  created_at: Date;
  updated_by: number | null;
  updated_at: Date | null;
  is_deleted: boolean;
  deleted_by: number | null;
  deleted_at: Date | null;
}

/**
 * IUserProfile Interface - Customer profile data
 */
export interface IUserProfile {
  id: number;
  user_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  profile_image_url: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  date_of_birth: Date | null;
  marketing_email_consent: boolean;
  marketing_sms_consent: boolean;
  marketing_push_consent: boolean;
  marketing_preferences: Record<string, any> | null;
  loyalty_enrolled: boolean;
  loyalty_points: number;
  loyalty_tier: string | null;
  credit_balance: number;
  customer_segment: string | null;
  risk_profile: 'low' | 'medium' | 'high';
  referral_code: string | null;
  referred_by_user_id: number | null;
  gdpr_status: 'na' | 'pending' | 'compliant';
  gdpr_consent_at: Date | null;
  created_by: number | null;
  created_at: Date;
  updated_by: number | null;
  updated_at: Date | null;
  is_deleted: boolean;
  deleted_by: number | null;
  deleted_at: Date | null;
}

/**
 * IAdminProfile Interface - Admin-specific data
 * Permissions are managed through RBAC system, not stored here
 */
export interface IAdminProfile {
  id: number;
  user_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  employee_id: string;
  department: 'sales' | 'support' | 'marketing' | 'operations' | 'finance' | 'it' | 'management';
  level: 'junior' | 'senior' | 'lead' | 'manager' | 'director' | 'executive';
  work_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  hire_date: Date | null;
  manager_user_id: number | null;
  internal_notes: string | null;
  created_by: number | null;
  created_at: Date;
  updated_by: number | null;
  updated_at: Date | null;
  is_deleted: boolean;
  deleted_by: number | null;
  deleted_at: Date | null;
}
