/**
 * Role Permissions API
 * GET/POST/DELETE /api/rbac/roles/:roleId/permissions
 * Manage role permission assignments
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, parseIdParam, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import {
    findRoleById,
    findPermissionById,
    findRolePermissions,
    assignPermissionToRole,
    removePermissionFromRole,
} from '../shared/queries';
import { rbacCacheService } from '../services/rbac-cache.service';
import { Permission } from '../shared/schema';

// Validation schema
const assignPermissionSchema = z.object({
    permission_id: z.number().int().positive('Permission ID must be a positive integer'),
});

type AssignPermissionDto = z.infer<typeof assignPermissionSchema>;

// ============================================
// Business Logic Functions
// ============================================

interface RolePermissionsResult {
    role: { id: number; name: string };
    permissions: Permission[];
}

async function getRolePermissions(roleId: number): Promise<RolePermissionsResult> {
    const role = await findRoleById(roleId);
    if (!role) {
        throw new HttpException(404, 'Role not found');
    }

    const rolePermissions = await findRolePermissions(roleId);
    const permissions = rolePermissions.map((rp) => rp.permission);

    return {
        role: { id: role.id, name: role.name },
        permissions,
    };
}

async function handleAssignPermission(
    roleId: number,
    permissionId: number,
    assignedBy: number
): Promise<{ role_id: number; permission: Permission }> {
    const role = await findRoleById(roleId);
    if (!role) {
        throw new HttpException(404, 'Role not found');
    }

    const permission = await findPermissionById(permissionId);
    if (!permission) {
        throw new HttpException(404, 'Permission not found');
    }

    await assignPermissionToRole(roleId, permissionId, assignedBy);
    rbacCacheService.invalidateAll();

    return { role_id: roleId, permission };
}

async function handleRemovePermission(roleId: number, permissionId: number): Promise<void> {
    const role = await findRoleById(roleId);
    if (!role) {
        throw new HttpException(404, 'Role not found');
    }

    await removePermissionFromRole(roleId, permissionId);
    rbacCacheService.invalidateAll();
}

// ============================================
// Handlers
// ============================================

const getHandler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const roleId = parseIdParam(req, 'roleId');
    const result = await getRolePermissions(roleId);
    ResponseFormatter.success(res, result, 'Role permissions retrieved successfully');
});

const postHandler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const roleId = parseIdParam(req, 'roleId');
    const userId = getUserId(req);
    const { permission_id }: AssignPermissionDto = req.body;

    const result = await handleAssignPermission(roleId, permission_id, userId);
    ResponseFormatter.success(res, result, `Permission assigned to role successfully`);
});

const deleteHandler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const roleId = parseIdParam(req, 'roleId');
    const permissionId = parseIdParam(req, 'permissionId');

    await handleRemovePermission(roleId, permissionId);
    ResponseFormatter.success(res, null, 'Permission removed from role successfully');
});

// ============================================
// Router
// ============================================

const router = Router();
router.get('/:roleId/permissions', requireAuth, requirePermission('roles:read'), getHandler);
router.post('/:roleId/permissions', requireAuth, requirePermission('permissions:assign'), validationMiddleware(assignPermissionSchema), postHandler);
router.delete('/:roleId/permissions/:permissionId', requireAuth, requirePermission('permissions:assign'), deleteHandler);

export default router;
