/**
 * POST /api/rbac/roles
 * Create a new role (requires roles:manage permission)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { createRole, findRoleByName } from '../shared/queries';
import { Role } from '../shared/schema';

const schema = z.object({
    name: z
        .string()
        .min(2, 'Role name must be at least 2 characters')
        .max(50, 'Role name must be at most 50 characters')
        .regex(/^[a-z_]+$/, 'Role name must be lowercase with underscores only'),
    description: z.string().max(500).optional(),
});

type CreateRoleDto = z.infer<typeof schema>;

async function handleCreateRole(data: CreateRoleDto, createdBy: number): Promise<Role> {
    // Check if role already exists
    const existingRole = await findRoleByName(data.name);
    if (existingRole) {
        throw new HttpException(409, `Role '${data.name}' already exists`);
    }

    // Create the role (user-created roles are never system roles)
    const newRole = await createRole({
        name: data.name,
        description: data.description,
        is_system_role: false,
        created_by: createdBy,
    });

    return newRole;
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const userId = getUserId(req);
    const roleData: CreateRoleDto = req.body;
    const newRole = await handleCreateRole(roleData, userId);
    ResponseFormatter.created(res, newRole, 'Role created successfully');
});

const router = Router();
router.post('/', requireAuth, requirePermission('roles:manage'), validationMiddleware(schema), handler);

export default router;
