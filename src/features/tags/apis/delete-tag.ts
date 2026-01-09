/**
 * DELETE /api/tags/:id
 * Soft delete a tag
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Validation schema
const paramsSchema = z.object({
    id: z.string().uuid(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = paramsSchema.safeParse(req.params);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid tag ID');
    }

    const { id } = validation.data;

    // Check if tag exists
    const [existing] = await db
        .select()
        .from(tags)
        .where(and(
            eq(tags.id, id),
            eq(tags.is_deleted, false)
        ))
        .limit(1);

    if (!existing) {
        throw new HttpException(404, 'Tag not found');
    }

    // Soft delete
    await db
        .update(tags)
        .set({
            is_deleted: true,
            updated_at: new Date(),
        })
        .where(eq(tags.id, id));

    return ResponseFormatter.success(
        res,
        null,
        'Tag deleted successfully'
    );
};

const router = Router();
router.delete('/:id', requireAuth, requirePermission('tags:delete'), handler);

export default router;
