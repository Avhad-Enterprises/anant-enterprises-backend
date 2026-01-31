/**
 * POST /api/rbac/roles
 * Create a new role (requires roles:manage permission)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { createRole, findRoleByName } from '../shared/queries';
import { Role } from '../shared/roles.schema';
import { mediumTextSchema } from '../../../utils';

const schema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be at most 50 characters')
    .regex(/^[a-z_]+$/, 'Role name must be lowercase with underscores only'),
  description: mediumTextSchema.optional(),
});

type CreateRoleDto = z.infer<typeof schema>;

async function handleCreateRole(data: CreateRoleDto, createdBy: string): Promise<Role> {
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

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }
  const roleData: CreateRoleDto = req.body;
  const newRole = await handleCreateRole(roleData, userId);
  ResponseFormatter.created(res, newRole, 'Role created successfully');
};

const router = Router();
router.post(
  '/',
  requireAuth,
  requirePermission('roles:manage'),
  validationMiddleware(schema),
  handler
);

export default router;
