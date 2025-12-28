/**
 * IAdminProfile Interface - Admin-specific data
 */
export interface IAdminProfile {
  id: number;
  user_id: number;
  name: string;
  employee_id: string;
  department: 'sales' | 'support' | 'marketing' | 'operations' | 'finance' | 'it' | 'management';
  level: 'junior' | 'senior' | 'lead' | 'manager' | 'director' | 'executive';
  work_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  hire_date: Date | null;
  manager_user_id: number | null;
  can_create_users: boolean;
  can_delete_users: boolean;
  can_manage_roles: boolean;
  can_view_reports: boolean;
  can_manage_products: boolean;
  can_manage_orders: boolean;
  additional_permissions: Record<string, any> | null;
  internal_notes: string | null;
  created_by: number | null;
  created_at: Date;
  updated_by: number | null;
  updated_at: Date | null;
  is_deleted: boolean;
  deleted_by: number | null;
  deleted_at: Date | null;
}
