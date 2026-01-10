/**
 * PUT /api/tiers/:id
 * Update a tier
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Validation schemas
const paramsSchema = z.object({
    id: z.string().uuid(),
});

const updateTierSchema = z.object({
    name: z.string().min(1).max(255).trim().optional(),
    code: z.string().min(1).max(255).trim().optional(),
    description: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    // Validate params
    const paramsValidation = paramsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
        throw new HttpException(400, 'Invalid tier ID');
    }

    // Validate body
    const bodyValidation = updateTierSchema.safeParse(req.body);
    if (!bodyValidation.success) {
        throw new HttpException(400, 'Invalid request data');
    }

    const { id } = paramsValidation.data;
    const data = bodyValidation.data;

    // Check if tier exists
    const [existing] = await db
        .select()
        .from(tiers)
        .where(eq(tiers.id, id))
        .limit(1);

    if (!existing) {
        throw new HttpException(404, 'Tier not found');
    }

    // If updating code, check for duplicates
    if (data.code && data.code !== existing.code) {
        const [duplicate] = await db
            .select()
            .from(tiers)
            .where(eq(tiers.code, data.code))
            .limit(1);

        if (duplicate && duplicate.id !== id) {
            throw new HttpException(409, `Tier with code "${data.code}" already exists`);
        }
    }

    // Update tier
    const [updated] = await db
        .update(tiers)
        .set({
            ...data,
            updated_at: new Date(),
        })
        .where(eq(tiers.id, id))
        .returning();

    return ResponseFormatter.success(
        res,
        {
            id: updated.id,
            name: updated.name,
            code: updated.code,
            description: updated.description,
            level: updated.level,
            parent_id: updated.parent_id,
            status: updated.status,
            usage_count: updated.usage_count,
            updated_at: updated.updated_at,
        },
        'Tier updated successfully'
    );
};

const router = Router();
router.put('/:id', requireAuth, requirePermission('tiers:update'), handler);

export default router;
