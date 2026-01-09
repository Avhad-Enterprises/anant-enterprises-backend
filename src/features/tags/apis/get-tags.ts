/**
 * GET /api/tags
 * Get all active tags for autocomplete/dropdown
 * - Public access (or admin only, based on your needs)
 * - Returns tags sorted by usage_count
 */

import { Router, Response, Request } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';

interface TagResponse {
    id: string;
    name: string;
    type: string;
    usage_count: number;
}

const handler = async (req: Request, res: Response) => {
    const { type } = req.query;

    // Build filter conditions
    const conditions = [
        eq(tags.status, true),
        eq(tags.is_deleted, false)
    ];

    // Optionally filter by type (e.g., 'product', 'order', etc.)
    if (type && typeof type === 'string') {
        conditions.push(eq(tags.type, type));
    }

    // Fetch active tags, sorted by usage count (most used first)
    const activeTags = await db
        .select({
            id: tags.id,
            name: tags.name,
            type: tags.type,
            usage_count: tags.usage_count,
        })
        .from(tags)
        .where(and(...conditions))
        .orderBy(desc(tags.usage_count), tags.name);

    const formattedTags: TagResponse[] = activeTags.map(tag => ({
        id: tag.id,
        name: tag.name,
        type: tag.type,
        usage_count: tag.usage_count,
    }));

    return ResponseFormatter.success(
        res,
        formattedTags,
        `Found ${formattedTags.length} tags`
    );
};

const router = Router();
router.get('/', handler);

export default router;
