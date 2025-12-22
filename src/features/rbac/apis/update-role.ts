/**
 * PUT /api/rbac/roles/:roleId
 * Update a role (requires roles:manage permission)
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
import { findRoleById, findRoleByName, updateRole } from '../shared/queries';
import { rbacCacheService } from '../services/rbac-cache.service';
import { Role } from '../shared/schema';

const schema = z.object({
    name: z
        .string()
        .min(2, 'Role name must be at least 2 characters')
        .max(50, 'Role name must be at most 50 characters')
        .regex(/^[a-z_]+$/, 'Role name must be lowercase with underscores only')
        .optional(),
    description: z.string().max(500).optional(),
    is_active: z.boolean().optional(),
});

type UpdateRoleDto = z.infer<typeof schema>;

async function handleUpdateRole(
    roleId: number,
    data: UpdateRoleDto,
    updatedBy: number
): Promise<Role> {
    const existingRole = await findRoleById(roleId);
    if (!existingRole) {
        throw new HttpException(404, 'Role not found');
    }

    // Cannot update system roles name
    if (existingRole.is_system_role && data.name && data.name !== existingRole.name) {
        throw new HttpException(400, 'Cannot change the name of a system role');
    }

    // Check name uniqueness if changing name
    if (data.name && data.name !== existingRole.name) {
        const roleWithName = await findRoleByName(data.name);
        if (roleWithName) {
            throw new HttpException(409, `Role '${data.name}' already exists`);
        }
    }

    const updatedRole = await updateRole(roleId, {
        ...data,
        updated_by: updatedBy,
    });

    // Invalidate cache since role might have changed
    rbacCacheService.invalidateAll();

    return updatedRole;
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const roleId = parseIdParam(req, 'roleId');
    const userId = getUserId(req);
    const updateData: UpdateRoleDto = req.body;

    const updatedRole = await handleUpdateRole(roleId, updateData, userId);
    ResponseFormatter.success(res, updatedRole, 'Role updated successfully');
});

const router = Router();
router.put('/:roleId', requireAuth, requirePermission('roles:manage'), validationMiddleware(schema), handler);

export default router;
