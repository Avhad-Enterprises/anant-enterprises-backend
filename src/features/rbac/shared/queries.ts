/**
 * RBAC Database Queries
 *
 * Query functions for Role-Based Access Control operations
 */

import { eq, and, isNull, inArray, gt, or } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { roles, permissions, rolePermissions, userRoles } from './schema';

// ============================================
// ROLE QUERIES
// ============================================

/**
 * Find all active roles
 */
export async function findAllRoles() {
    return db
        .select()
        .from(roles)
        .where(and(eq(roles.is_deleted, false), eq(roles.is_active, true)));
}

/**
 * Find role by ID
 */
export async function findRoleById(id: number) {
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    return role;
}

/**
 * Find role by name
 */
export async function findRoleByName(name: string) {
    const [role] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
    return role;
}

/**
 * Create a new role
 */
export async function createRole(data: {
    name: string;
    description?: string;
    is_system_role?: boolean;
    created_by?: number;
}) {
    const [role] = await db
        .insert(roles)
        .values({
            name: data.name,
            description: data.description,
            is_system_role: data.is_system_role ?? false,
            created_by: data.created_by,
        })
        .returning();
    return role;
}

/**
 * Update a role
 */
export async function updateRole(
    id: number,
    data: { name?: string; description?: string; is_active?: boolean; updated_by?: number }
) {
    const [role] = await db
        .update(roles)
        .set({
            ...data,
            updated_at: new Date(),
        })
        .where(eq(roles.id, id))
        .returning();
    return role;
}

/**
 * Soft delete a role
 */
export async function deleteRole(id: number, deleted_by: number) {
    const [role] = await db
        .update(roles)
        .set({
            is_deleted: true,
            deleted_by,
            deleted_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(roles.id, id))
        .returning();
    return role;
}

// ============================================
// PERMISSION QUERIES
// ============================================

/**
 * Find all permissions
 */
export async function findAllPermissions() {
    return db.select().from(permissions);
}

/**
 * Find permission by ID
 */
export async function findPermissionById(id: number) {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, id)).limit(1);
    return permission;
}

/**
 * Find permission by name
 */
export async function findPermissionByName(name: string) {
    const [permission] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.name, name))
        .limit(1);
    return permission;
}

/**
 * Find permissions by resource
 */
export async function findPermissionsByResource(resource: string) {
    return db.select().from(permissions).where(eq(permissions.resource, resource));
}

/**
 * Create a new permission
 */
export async function createPermission(data: {
    name: string;
    resource: string;
    action: string;
    description?: string;
}) {
    const [permission] = await db.insert(permissions).values(data).returning();
    return permission;
}

// ============================================
// ROLE-PERMISSION QUERIES
// ============================================

/**
 * Get all permissions for a role
 */
export async function findRolePermissions(roleId: number) {
    return db
        .select({
            permission: permissions,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permission_id, permissions.id))
        .where(eq(rolePermissions.role_id, roleId));
}

/**
 * Assign permission to role
 */
export async function assignPermissionToRole(
    roleId: number,
    permissionId: number,
    assignedBy?: number
) {
    const [assignment] = await db
        .insert(rolePermissions)
        .values({
            role_id: roleId,
            permission_id: permissionId,
            assigned_by: assignedBy,
        })
        .onConflictDoNothing()
        .returning();
    return assignment;
}

/**
 * Remove permission from role
 */
export async function removePermissionFromRole(roleId: number, permissionId: number) {
    await db
        .delete(rolePermissions)
        .where(and(eq(rolePermissions.role_id, roleId), eq(rolePermissions.permission_id, permissionId)));
}

/**
 * Assign multiple permissions to role
 */
export async function assignPermissionsToRole(
    roleId: number,
    permissionIds: number[],
    assignedBy?: number
) {
    if (permissionIds.length === 0) return [];

    const values = permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
        assigned_by: assignedBy,
    }));

    return db.insert(rolePermissions).values(values).onConflictDoNothing().returning();
}

// ============================================
// USER-ROLE QUERIES
// ============================================

/**
 * Get all roles for a user (active, non-expired)
 */
export async function findUserRoles(userId: number) {
    const now = new Date();
    return db
        .select({
            role: roles,
            assigned_at: userRoles.assigned_at,
            expires_at: userRoles.expires_at,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.role_id, roles.id))
        .where(
            and(
                eq(userRoles.user_id, userId),
                eq(roles.is_deleted, false),
                eq(roles.is_active, true),
                or(isNull(userRoles.expires_at), gt(userRoles.expires_at, now))
            )
        );
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(
    userId: number,
    roleId: number,
    assignedBy?: number,
    expiresAt?: Date
) {
    const [assignment] = await db
        .insert(userRoles)
        .values({
            user_id: userId,
            role_id: roleId,
            assigned_by: assignedBy,
            expires_at: expiresAt,
        })
        .onConflictDoNothing()
        .returning();
    return assignment;
}

/**
 * Remove role from user
 */
export async function removeRoleFromUser(userId: number, roleId: number) {
    await db
        .delete(userRoles)
        .where(and(eq(userRoles.user_id, userId), eq(userRoles.role_id, roleId)));
}

/**
 * Get all effective permissions for a user
 * Aggregates permissions from all assigned roles
 */
export async function findUserPermissions(userId: number): Promise<string[]> {
    const now = new Date();

    // Get all role IDs for the user
    const userRoleRows = await db
        .select({ role_id: userRoles.role_id })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.role_id, roles.id))
        .where(
            and(
                eq(userRoles.user_id, userId),
                eq(roles.is_deleted, false),
                eq(roles.is_active, true),
                or(isNull(userRoles.expires_at), gt(userRoles.expires_at, now))
            )
        );

    if (userRoleRows.length === 0) {
        return [];
    }

    const roleIds = userRoleRows.map((r) => r.role_id);

    // Get all permissions for these roles
    const permissionRows = await db
        .select({ name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permission_id, permissions.id))
        .where(inArray(rolePermissions.role_id, roleIds));

    // Return unique permission names
    return [...new Set(permissionRows.map((p) => p.name))];
}

/**
 * Check if user has a specific permission
 */
export async function userHasPermission(userId: number, permissionName: string): Promise<boolean> {
    const userPerms = await findUserPermissions(userId);

    // Check for wildcard permission (superadmin)
    if (userPerms.includes('*')) {
        return true;
    }

    return userPerms.includes(permissionName);
}

/**
 * Get users count for a role
 */
export async function countUsersWithRole(roleId: number): Promise<number> {
    const result = await db
        .select({ user_id: userRoles.user_id })
        .from(userRoles)
        .where(eq(userRoles.role_id, roleId));
    return result.length;
}

/**
 * Get permissions count for a role
 */
export async function countRolePermissions(roleId: number): Promise<number> {
    const result = await db
        .select({ permission_id: rolePermissions.permission_id })
        .from(rolePermissions)
        .where(eq(rolePermissions.role_id, roleId));
    return result.length;
}
