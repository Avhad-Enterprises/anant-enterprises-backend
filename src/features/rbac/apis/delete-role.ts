/**
 * DELETE /api/rbac/roles/:roleId
 * Delete a role (soft delete, requires roles:manage permission)
 */

import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { asyncHandler, parseIdParam, getUserId } from '../../../utils';
import { HttpException } from '../../../utils';
import { findRoleById, deleteRole, countUsersWithRole } from '../shared/queries';
import { rbacCacheService } from '../services/rbac-cache.service';

async function handleDeleteRole(roleId: number, deletedBy: number): Promise<void> {
    const existingRole = await findRoleById(roleId);
    if (!existingRole) {
        throw new HttpException(404, 'Role not found');
    }

    // Cannot delete system roles
    if (existingRole.is_system_role) {
        throw new HttpException(400, 'Cannot delete system roles');
    }

    // Check if any users have this role
    const usersWithRole = await countUsersWithRole(roleId);
    if (usersWithRole > 0) {
        throw new HttpException(
            400,
            `Cannot delete role: ${usersWithRole} user(s) are currently assigned to this role`
        );
    }

    await deleteRole(roleId, deletedBy);

    // Invalidate all cache since role is deleted
    rbacCacheService.invalidateAll();
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const roleId = parseIdParam(req, 'roleId');
    const userId = getUserId(req);

    await handleDeleteRole(roleId, userId);
    ResponseFormatter.success(res, null, 'Role deleted successfully');
});

const router = Router();
router.delete('/:roleId', requireAuth, requirePermission('roles:manage'), handler);

export default router;
