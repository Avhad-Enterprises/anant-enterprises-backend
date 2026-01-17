/**
 * DELETE /api/tiers/:id
 * Delete a tier (soft delete via status change)
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Validation schema
const paramsSchema = z.object({
    id: z.string().uuid(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = paramsSchema.safeParse(req.params);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid tier ID');
    }

    const { id } = validation.data;

    // Check if tier exists
    const [existing] = await db
        .select()
        .from(tiers)
        .where(eq(tiers.id, id))
        .limit(1);

    if (!existing) {
        throw new HttpException(404, 'Tier not found');
    }

    // Check if tier has active (non-deleted) children
    const children = await db
        .select()
        .from(tiers)
        .where(and(eq(tiers.parent_id, id), eq(tiers.is_deleted, false)))
        .limit(1);

    if (children.length > 0) {
        throw new HttpException(
            409,
            'Cannot delete tier with sub-tiers. Please delete or reassign child tiers first.'
        );
    }

    // Check if tier is being used by products
    if (existing.usage_count > 0) {
        throw new HttpException(
            409,
            `Cannot delete tier with ${existing.usage_count} product(s) assigned. Please remove products first.`
        );
    }

    // Soft delete by setting is_deleted to true
    await db
        .update(tiers)
        .set({
            is_deleted: true,
            updated_at: new Date(),
        })
        .where(eq(tiers.id, id));

    // Return deleted tier info for frontend navigation
    return ResponseFormatter.success(
        res,
        {
            id: existing.id,
            level: existing.level,
            parent_id: existing.parent_id,
        },
        'Tier deleted successfully'
    );
};

const router = Router();
router.delete('/:id', requireAuth, requirePermission('tiers:delete'), handler);

export default router;
