/**
 * User Roles API
 * GET/POST/DELETE /api/rbac/users/:userId/roles
 * Manage user role assignments
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission, requireOwnerOrPermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { asyncHandler, parseIdParam, getUserId } from '../../../utils';
import { HttpException } from '../../../utils';
import {
    findRoleById,
    findUserRoles,
    assignRoleToUser,
    removeRoleFromUser,
    findUserPermissions,
} from '../shared/queries';
import { rbacCacheService } from '../services/rbac-cache.service';
import { findUserById } from '../../user';
import { Role } from '../shared/schema';
import { IUserPermissionsResponse } from '../shared/interface';

// Validation schema
const assignRoleSchema = z.object({
    role_id: z.number().int().positive('Role ID must be a positive integer'),
    expires_at: z.string().datetime().optional(),
});

type AssignRoleDto = z.infer<typeof assignRoleSchema>;

// ============================================
// Business Logic Functions
// ============================================

interface UserRolesResult {
    user_id: number;
    roles: Array<Role & { assigned_at: Date; expires_at: Date | null }>;
}

async function getUserRoles(userId: number): Promise<UserRolesResult> {
    const userRoles = await findUserRoles(userId);
    const roles = userRoles.map((ur) => ({
        ...ur.role,
        assigned_at: ur.assigned_at,
        expires_at: ur.expires_at,
    }));

    return { user_id: userId, roles };
}

async function getUserPermissionsData(userId: number): Promise<IUserPermissionsResponse> {
    const permissions = await findUserPermissions(userId);
    const userRoles = await findUserRoles(userId);
    const roleNames = userRoles.map((ur) => ur.role.name);

    return {
        user_id: userId,
        roles: roleNames,
        permissions,
        has_wildcard: permissions.includes('*'),
    };
}

async function handleAssignRole(
    userId: number,
    roleId: number,
    assignedBy: number,
    expiresAt?: string
): Promise<{ user_id: number; role: Role }> {
    const user = await findUserById(userId);
    if (!user) {
        throw new HttpException(404, 'User not found');
    }

    const role = await findRoleById(roleId);
    if (!role) {
        throw new HttpException(404, 'Role not found');
    }

    const expiresAtDate = expiresAt ? new Date(expiresAt) : undefined;
    await assignRoleToUser(userId, roleId, assignedBy, expiresAtDate);
    rbacCacheService.invalidateUser(userId);

    return { user_id: userId, role };
}

async function handleRemoveRole(userId: number, roleId: number): Promise<void> {
    await removeRoleFromUser(userId, roleId);
    rbacCacheService.invalidateUser(userId);
}

// ============================================
// Handlers
// ============================================

const getRolesHandler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const userId = parseIdParam(req, 'userId');
    const result = await getUserRoles(userId);
    ResponseFormatter.success(res, result, 'User roles retrieved successfully');
});

const getPermissionsHandler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const userId = parseIdParam(req, 'userId');
    const result = await getUserPermissionsData(userId);
    ResponseFormatter.success(res, result, 'User permissions retrieved successfully');
});

const postHandler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const targetUserId = parseIdParam(req, 'userId');
    const assignedBy = getUserId(req);
    const { role_id, expires_at }: AssignRoleDto = req.body;

    const result = await handleAssignRole(targetUserId, role_id, assignedBy, expires_at);
    ResponseFormatter.success(res, result, `Role assigned to user successfully`);
});

const deleteHandler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const userId = parseIdParam(req, 'userId');
    const roleId = parseIdParam(req, 'roleId');

    await handleRemoveRole(userId, roleId);
    ResponseFormatter.success(res, null, 'Role removed from user successfully');
});

// ============================================
// Router
// ============================================

// ... handlers ...

const router = Router();
router.get('/:userId/roles', requireAuth, requireOwnerOrPermission('userId', 'users:read'), getRolesHandler);
router.get('/:userId/permissions', requireAuth, requireOwnerOrPermission('userId', 'users:read'), getPermissionsHandler);
router.post('/:userId/roles', requireAuth, requirePermission('roles:manage'), validationMiddleware(assignRoleSchema), postHandler);
router.delete('/:userId/roles/:roleId', requireAuth, requirePermission('roles:manage'), deleteHandler);

export default router;
