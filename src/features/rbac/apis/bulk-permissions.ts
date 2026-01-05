/**
 * POST /api/rbac/roles/:roleId/permissions/bulk
 * Assign multiple permissions to a role in a single request
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import {
  findRoleById,
  findPermissionById,
  assignPermissionsToRole,
  findRolePermissions,
} from '../shared/queries';
import { rbacCacheService } from '../services/rbac-cache.service';
import { uuidArraySchema } from '../../../utils/validation/common-schemas';

const schema = z.object({
  permission_ids: uuidArraySchema(50),
});

type BulkAssignDto = z.infer<typeof schema>;

interface BulkAssignResult {
  role_id: string;
  role_name: string;
  assigned_count: number;
  skipped_count: number;
  permission_ids: string[];
}

async function handleBulkAssign(
  roleId: string,
  permissionIds: string[],
  assignedBy: string
): Promise<BulkAssignResult> {
  const role = await findRoleById(roleId);
  if (!role) {
    throw new HttpException(404, 'Role not found');
  }

  // Validate all permissions exist
  const validPermissionIds: string[] = [];
  for (const permId of permissionIds) {
    const permission = await findPermissionById(permId);
    if (permission) {
      validPermissionIds.push(permId);
    }
  }

  if (validPermissionIds.length === 0) {
    throw new HttpException(400, 'No valid permission IDs provided');
  }

  // Get current permissions to calculate skipped
  const currentPermissions = await findRolePermissions(roleId);
  const currentPermissionIds = currentPermissions.map(rp => rp.permission.id);

  // Filter out already assigned permissions
  const newPermissionIds = validPermissionIds.filter(id => !currentPermissionIds.includes(id));
  const skippedCount = validPermissionIds.length - newPermissionIds.length;

  // Assign new permissions
  if (newPermissionIds.length > 0) {
    await assignPermissionsToRole(roleId, newPermissionIds, assignedBy);
  }

  // Invalidate cache
  rbacCacheService.invalidateAll();

  return {
    role_id: roleId,
    role_name: role.name,
    assigned_count: newPermissionIds.length,
    skipped_count: skippedCount,
    permission_ids: newPermissionIds,
  };
}

const handler = async (req: RequestWithUser, res: Response) => {
  const roleId = req.params.roleId;
  if (!roleId) {
    throw new HttpException(400, 'Invalid roleId parameter');
  }
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }
  const { permission_ids }: BulkAssignDto = req.body;

  const result = await handleBulkAssign(roleId, permission_ids, userId);
  ResponseFormatter.success(
    res,
    result,
    `Assigned ${result.assigned_count} permissions (${result.skipped_count} skipped as already assigned)`
  );
};

const router = Router();
router.post(
  '/:roleId/permissions/bulk',
  requireAuth,
  requirePermission('permissions:assign'),
  validationMiddleware(schema),
  handler
);

export default router;
