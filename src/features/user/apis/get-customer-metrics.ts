/**
 * GET /api/users/metrics
 * Get customer statistics (Total, Active, Inactive)
 */

import { Router, Response } from 'express';
import { eq, and, or, count } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
import { businessCustomerProfiles } from '../shared/business-profiles.schema';

const handler = async (req: RequestWithUser, res: Response) => {
  try {
    // 1. Total Customers (non-deleted)
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.is_deleted, false));

    const total = totalResult?.count ?? 0;

    // 2. Active Customers
    // Active means: (Individual AND active profile) OR (Business AND active profile)
    // We join both profiles
    const [activeResult] = await db
      .select({ count: count() })
      .from(users)
      .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
      .leftJoin(businessCustomerProfiles, eq(users.id, businessCustomerProfiles.user_id))
      .where(
        and(
          eq(users.is_deleted, false),
          or(
            and(
              eq(users.user_type, 'individual'),
              eq(customerProfiles.account_status, 'active')
            ),
            and(
              eq(users.user_type, 'business'),
              eq(businessCustomerProfiles.account_status, 'active')
            )
          )
        )
      );

    const active = activeResult?.count ?? 0;
    const inactive = total - active;

    ResponseFormatter.success(res, {
      total,
      active,
      inactive
    }, 'Customer metrics retrieved successfully');

  } catch (error: any) {
    logger.error('Failed to fetch customer metrics:', error);
    throw new HttpException(500, error.message || 'Failed to fetch customer metrics');
  }
};

const router = Router();

router.get(
  '/metrics',
  requireAuth,
  requirePermission('users:read'),
  handler
);

export default router;
