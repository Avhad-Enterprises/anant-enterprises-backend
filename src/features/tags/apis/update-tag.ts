/**
 * PUT /api/tags/:id
 * Update a tag
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

// Validation schemas
const paramsSchema = z.object({
    id: z.string().uuid(),
});

const updateTagSchema = z.object({
    name: z.string().min(1).max(255).trim().optional(),
    type: z.enum(['customer', 'product', 'blogs', 'order'] as const).optional(),
    status: z.boolean().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    // Validate params
    const paramsValidation = paramsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
        throw new HttpException(400, 'Invalid tag ID');
    }

    // Validate body
    const bodyValidation = updateTagSchema.safeParse(req.body);
    if (!bodyValidation.success) {
        throw new HttpException(400, 'Invalid request data');
    }

    const { id } = paramsValidation.data;
    const data = bodyValidation.data;

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

    // If updating name, check for duplicates
    if (data.name) {
        const normalizedName = data.name.toLowerCase();

        const [duplicate] = await db
            .select()
            .from(tags)
            .where(and(
                eq(tags.name, normalizedName),
                eq(tags.is_deleted, false)
            ))
            .limit(1);

        if (duplicate && duplicate.id !== id) {
            throw new HttpException(409, `Tag "${data.name}" already exists`);
        }

        data.name = normalizedName;
    }

    // Update tag
    const [updated] = await db
        .update(tags)
        .set({
            ...data,
            updated_at: new Date(),
        })
        .where(eq(tags.id, id))
        .returning();

    return ResponseFormatter.success(
        res,
        {
            id: updated.id,
            name: updated.name,
            type: updated.type,
            status: updated.status,
            usage_count: updated.usage_count,
            updated_at: updated.updated_at,
        },
        'Tag updated successfully'
    );
};

const router = Router();
router.put('/:id', requireAuth, requirePermission('tags:update'), handler);

export default router;
