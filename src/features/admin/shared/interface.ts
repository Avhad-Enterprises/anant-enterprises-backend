/**
 * Admin Profile Interfaces
 *
 * TypeScript interfaces for admin-related types.
 */

// ============================================
// ADMIN PROFILE
// ============================================

export interface IAdminProfile {
  id: string; // UUID
  user_id: string;
  employee_id?: string;
  department?: string;
  job_title?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}
