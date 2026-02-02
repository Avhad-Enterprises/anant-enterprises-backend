/**
 * POST /api/admin/orders/tags
 * Admin: Create a new order tag
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { HttpException, ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../../tags/shared/tags.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { logger } from '../../../utils';

const bodySchema = z.object({
    name: z.string().min(1).max(255),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { name } = bodySchema.parse(req.body);

    try {
        const [newTag] = await db
            .insert(tags)
            .values({
                name,
                type: 'order',
                usage_count: 0,
                status: true,
                created_by: req.userId,
            })
            .returning();

        logger.info('Order tag created', {
            tagId: newTag.id,
            tagName: name,
            userId: req.userId,
        });

        return ResponseFormatter.success(res, {
            tag: newTag,
        }, 'Order tag created successfully', 201);
    } catch (error) {
        // Handle duplicate tag name
        if (error instanceof Error && error.message.includes('unique')) {
            throw new HttpException(409, 'Tag name already exists');
        }

        logger.error('Failed to create order tag', {
            tagName: name,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new HttpException(500, 'Failed to create tag');
    }
};

const router = Router();
router.post('/admin/orders/tags', requireAuth, requirePermission('orders:write'), handler);

export default router;
