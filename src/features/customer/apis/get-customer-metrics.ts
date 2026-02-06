/**
 * GET /api/users/metrics
 * Get customer statistics (Total, Active, Inactive)
 */

import { Router, Response } from 'express';
import { eq, and, or, count, notInArray } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
import { userRoles } from '../../rbac/shared/user-roles.schema';
import { roles } from '../../rbac/shared/roles.schema';

const handler = async (req: RequestWithUser, res: Response) => {
  // Admin exclusion subquery - reusable for both queries
  const adminUserIdsSubquery = db
    .select({ userId: userRoles.user_id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.role_id, roles.id))
    .where(or(eq(roles.name, 'admin'), eq(roles.name, 'superadmin')));

  // 1. Total Customers (non-deleted)
  // Count all users who have a customer profile (excludes admins)
  const [totalResult] = await db
    .select({ count: count() })
    .from(users)
    .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
    .where(
      and(
        eq(users.is_deleted, false),
        notInArray(users.id, adminUserIdsSubquery)
      )
    );

  const total = totalResult?.count ?? 0;

  // 2. Active Customers
  // Active means: Customers with active profile status
  const [activeResult] = await db
    .select({ count: count() })
    .from(users)
    .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
    .where(
      and(
        eq(users.is_deleted, false),
        eq(customerProfiles.account_status, 'active'),
        notInArray(users.id, adminUserIdsSubquery)
      )
    );

  const active = activeResult?.count ?? 0;
  const inactive = total - active;

  ResponseFormatter.success(res, {
    total,
    active,
    inactive
  }, 'Customer metrics retrieved successfully');
};

const router = Router();

router.get(
  '/metrics',
  requireAuth,
  requirePermission('users:read'),
  handler
);

export default router;
