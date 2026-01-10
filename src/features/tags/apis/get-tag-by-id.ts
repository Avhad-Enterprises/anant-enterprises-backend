/**
 * GET /api/tags/:id
 * Get a single tag by ID
 * Public access
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';

// Validation schema for params
const paramsSchema = z.object({
    id: z.string().uuid(),
});

const handler = async (req: Request, res: Response) => {
    const validation = paramsSchema.safeParse(req.params);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid tag ID');
    }

    const { id } = validation.data;

    // Fetch tag
    const [tag] = await db
        .select({
            id: tags.id,
            name: tags.name,
            type: tags.type,
            status: tags.status,
            usage_count: tags.usage_count,
            created_at: tags.created_at,
            updated_at: tags.updated_at,
        })
        .from(tags)
        .where(and(
            eq(tags.id, id),
            eq(tags.is_deleted, false)
        ))
        .limit(1);

    if (!tag) {
        throw new HttpException(404, 'Tag not found');
    }

    return ResponseFormatter.success(
        res,
        tag,
        'Tag retrieved successfully'
    );
};

const router = Router();
router.get('/:id', handler);

export default router;
