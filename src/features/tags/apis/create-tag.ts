/**
 * POST /api/tags
 * Create a new tag
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Validation schema
const createTagSchema = z.object({
    name: z.string().min(1).max(255).trim(),
    type: z.enum(['customer', 'product', 'blogs', 'order'] as const).default('product'),
    status: z.boolean().optional().default(true),
});

const handler = async (req: RequestWithUser, res: Response) => {
    // Validate request body
    const validation = createTagSchema.safeParse(req.body);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid request data');
    }

    const data = validation.data;

    // Normalize tag name (lowercase for uniqueness check)
    const normalizedName = data.name.toLowerCase();

    // Check if tag already exists
    const existing = await db
        .select()
        .from(tags)
        .where(eq(tags.name, normalizedName))
        .limit(1);

    if (existing.length > 0) {
        throw new HttpException(409, `Tag "${data.name}" already exists`);
    }

    // Create tag
    const [newTag] = await db
        .insert(tags)
        .values({
            name: normalizedName,
            type: data.type,
            status: data.status,
            usage_count: 0,
            created_by: req.userId,
        })
        .returning();

    return ResponseFormatter.success(
        res,
        {
            id: newTag.id,
            name: newTag.name,
            type: newTag.type,
            status: newTag.status,
            usage_count: newTag.usage_count,
            created_at: newTag.created_at,
        },
        'Tag created successfully',
        201
    );
};

const router = Router();
router.post('/', requireAuth, requirePermission('tags:create'), handler);

export default router;
