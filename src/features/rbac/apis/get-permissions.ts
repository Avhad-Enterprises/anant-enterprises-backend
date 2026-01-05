/**
 * GET /api/rbac/permissions
 * Get all permissions grouped by resource (requires permissions:read)
 */

import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { findAllPermissions } from '../shared/queries';
import { Permission } from '../shared/rbac.schema';

interface PermissionsResponse {
  permissions: Permission[];
  by_resource: Record<string, Permission[]>;
}

async function getAllPermissions(): Promise<PermissionsResponse> {
  const permissions = await findAllPermissions();

  // Group by resource
  const byResource = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  return { permissions, by_resource: byResource };
}

const handler = async (req: RequestWithUser, res: Response) => {
  const result = await getAllPermissions();
  ResponseFormatter.success(res, result, 'Permissions retrieved successfully');
};

const router = Router();
router.get('/', requireAuth, requirePermission('permissions:read'), handler);

export default router;
