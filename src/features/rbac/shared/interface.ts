/**
 * RBAC Interfaces
 *
 * Type definitions for Role-Based Access Control system
 */

import { Role, Permission, UserRole, RolePermission } from './schema';

// ============================================
// ROLE INTERFACES
// ============================================

export interface IRole {
  id: string;
  name: string;
  description?: string | null;
  is_system_role: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: Date;
  updated_by?: string | null;
  updated_at: Date;
  is_deleted: boolean;
}

export interface ICreateRole {
  name: string;
  description?: string;
  is_system_role?: boolean;
}

export interface IUpdateRole {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface IRoleWithPermissions extends IRole {
  permissions: IPermission[];
}

// ============================================
// PERMISSION INTERFACES
// ============================================

export interface IPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
  created_at: Date;
}

export interface ICreatePermission {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

// ============================================
// USER ROLE INTERFACES
// ============================================

export interface IUserRole {
  user_id: string;
  role_id: string;
  assigned_by?: string | null;
  assigned_at: Date;
  expires_at?: Date | null;
}

export interface IAssignRoleToUser {
  user_id: string;
  role_id: string;
  expires_at?: Date;
}

export interface IUserWithRoles {
  id: string;
  name: string;
  email: string;
  roles: IRole[];
  permissions: string[]; // Aggregated permission names
}

// ============================================
// PERMISSION CHECK INTERFACES
// ============================================

export interface ICachedPermissions {
  permissions: string[];
  roleIds: string[];
  expiresAt: number;
}

export interface IPermissionCheck {
  resource: string;
  action: string;
}

// ============================================
// API RESPONSE INTERFACES
// ============================================

export interface IRoleResponse {
  id: string;
  name: string;
  description?: string | null;
  is_system_role: boolean;
  is_active: boolean;
  permissions_count?: number;
  users_count?: number;
  created_at: Date;
}

export interface IPermissionResponse {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
}

export interface IUserPermissionsResponse {
  user_id: string;
  roles: string[];
  permissions: string[];
  has_wildcard: boolean;
}

// Re-export schema types for convenience
export type { Role, Permission, UserRole, RolePermission };
