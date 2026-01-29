/**
 * GET /api/admin/orders/tags
 * Admin: Get all order tags
 */

import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../../tags/shared/tags.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const handler = async (req: RequestWithUser, res: Response) => {
    // Get all order tags
    const orderTags = await db
        .select({
            id: tags.id,
            name: tags.name,
            usage_count: tags.usage_count,
            status: tags.status,
            created_at: tags.created_at,
        })
        .from(tags)
        .where(and(
            eq(tags.type, 'order'),
            eq(tags.is_deleted, false),
            eq(tags.status, true)
        ))
        .orderBy(tags.name);

    return ResponseFormatter.success(res, {
        tags: orderTags,
        total: orderTags.length,
    }, 'Order tags retrieved successfully');
};

const router = Router();
router.get('/admin/orders/tags', requireAuth, requirePermission('orders:read'), handler);

export default router;
