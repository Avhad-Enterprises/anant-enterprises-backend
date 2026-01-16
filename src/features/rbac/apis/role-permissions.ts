/**
 * Role Permissions API
 * GET/POST/DELETE /api/rbac/roles/:roleId/permissions
 * Manage role permission assignments
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import {
  findRoleById,
  findPermissionById,
  findRolePermissions,
  assignPermissionToRole,
  removePermissionFromRole,
} from '../shared/queries';
import { rbacCacheService } from '../services/rbac-cache.service';
import { Permission } from '../shared/rbac.schema';
import { uuidSchema } from '../../../utils/validation/common-schemas';

// Validation schema
const assignPermissionSchema = z.object({
  permission_id: uuidSchema,
});

type AssignPermissionDto = z.infer<typeof assignPermissionSchema>;

// ============================================
// Business Logic Functions
// ============================================

interface RolePermissionsResult {
  role: { id: string; name: string };
  permissions: Permission[];
}

async function getRolePermissions(roleId: string): Promise<RolePermissionsResult> {
  const role = await findRoleById(roleId);
  if (!role) {
    throw new HttpException(404, 'Role not found');
  }

  const rolePermissions = await findRolePermissions(roleId);
  const permissions = rolePermissions.map(rp => rp.permission);

  return {
    role: { id: role.id, name: role.name },
    permissions,
  };
}

async function handleAssignPermission(
  roleId: string,
  permissionId: string,
  assignedBy: string
): Promise<{ role_id: string; permission: Permission }> {
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

async function handleRemovePermission(roleId: string, permissionId: string): Promise<void> {
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

const getHandler = async (req: RequestWithUser, res: Response) => {
  const roleId = req.params.roleId;
  if (!roleId) {
    throw new HttpException(400, 'Invalid roleId parameter');
  }
  const result = await getRolePermissions(roleId);
  ResponseFormatter.success(res, result, 'Role permissions retrieved successfully');
};

const postHandler = async (req: RequestWithUser, res: Response) => {
  const roleId = req.params.roleId;
  if (!roleId) {
    throw new HttpException(400, 'Invalid roleId parameter');
  }
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }
  const { permission_id }: AssignPermissionDto = req.body;

  const result = await handleAssignPermission(roleId, permission_id, userId);
  ResponseFormatter.success(res, result, `Permission assigned to role successfully`);
};

const deleteHandler = async (req: RequestWithUser, res: Response) => {
  const roleId = req.params.roleId;
  if (!roleId) {
    throw new HttpException(400, 'Invalid roleId parameter');
  }
  const permissionId = req.params.permissionId;
  if (!permissionId) {
    throw new HttpException(400, 'Invalid permissionId parameter');
  }

  await handleRemovePermission(roleId, permissionId);
  ResponseFormatter.success(res, null, 'Permission removed from role successfully');
};

// ============================================
// Router
// ============================================

const router = Router();
router.get('/:roleId/permissions', requireAuth, requirePermission('roles:read'), getHandler);
router.post(
  '/:roleId/permissions',
  requireAuth,
  requirePermission('permissions:assign'),
  validationMiddleware(assignPermissionSchema),
  postHandler
);
router.delete(
  '/:roleId/permissions/:permissionId',
  requireAuth,
  requirePermission('permissions:assign'),
  deleteHandler
);

export default router;
