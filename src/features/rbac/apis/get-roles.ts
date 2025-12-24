/**
 * GET /api/rbac/roles
 * Get all roles with permission count (requires roles:read permission)
 */

import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import { ResponseFormatter } from '../../../utils/helpers/responseFormatter';
import { asyncHandler } from '../../../utils/helpers/controllerHelpers';
import { findAllRoles, countRolePermissions, countUsersWithRole } from '../shared/queries';
import { IRoleResponse } from '../shared/interface';

async function getAllRoles(): Promise<IRoleResponse[]> {
    const roles = await findAllRoles();

    // Enrich with counts
    const enrichedRoles = await Promise.all(
        roles.map(async (role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            is_system_role: role.is_system_role,
            is_active: role.is_active,
            permissions_count: await countRolePermissions(role.id),
            users_count: await countUsersWithRole(role.id),
            created_at: role.created_at,
        }))
    );

    return enrichedRoles;
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const roles = await getAllRoles();
    ResponseFormatter.success(res, roles, 'Roles retrieved successfully');
});

const router = Router();
router.get('/', requireAuth, requirePermission('roles:read'), handler);

export default router;
