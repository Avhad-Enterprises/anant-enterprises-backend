/**
 * POST /api/rbac/permissions
 * Create a new permission (requires permissions:assign permission)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { createPermission, findPermissionByName } from '../shared/queries';
import { Permission } from '../shared/schema';

const schema = z.object({
    name: z
        .string()
        .min(3, 'Permission name must be at least 3 characters')
        .max(100, 'Permission name must be at most 100 characters')
        .regex(/^[a-z_]+:[a-z_:]+$/, 'Permission name must be in format: resource:action (e.g., users:read)'),
    resource: z
        .string()
        .min(1, 'Resource is required')
        .max(50)
        .regex(/^[a-z_]+$/, 'Resource must be lowercase with underscores only'),
    action: z
        .string()
        .min(1, 'Action is required')
        .max(50)
        .regex(/^[a-z_:]+$/, 'Action must be lowercase with underscores/colons only'),
    description: z.string().max(500).optional(),
});

type CreatePermissionDto = z.infer<typeof schema>;

async function handleCreatePermission(data: CreatePermissionDto): Promise<Permission> {
    // Check if permission already exists
    const existingPermission = await findPermissionByName(data.name);
    if (existingPermission) {
        throw new HttpException(409, `Permission '${data.name}' already exists`);
    }

    // Validate that name matches resource:action pattern
    const expectedName = `${data.resource}:${data.action}`;
    if (data.name !== expectedName) {
        throw new HttpException(400, `Permission name must match resource:action format. Expected: ${expectedName}`);
    }

    const newPermission = await createPermission({
        name: data.name,
        resource: data.resource,
        action: data.action,
        description: data.description,
    });

    return newPermission;
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const permissionData: CreatePermissionDto = req.body;
    const newPermission = await handleCreatePermission(permissionData);
    ResponseFormatter.created(res, newPermission, 'Permission created successfully');
});

const router = Router();
router.post('/', requireAuth, requirePermission('permissions:assign'), validationMiddleware(schema), handler);

export default router;
