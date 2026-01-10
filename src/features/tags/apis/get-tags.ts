/**
 * GET /api/tags
 * Get all tags with pagination, filtering and sorting
 * - Supports pagination (page, limit)
 * - Supports filtering by type, status, search
 * - Returns { tags, total, page, limit }
 */

import { Router, Response, Request } from 'express';
import { eq, and, desc, like, count } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';

interface TagResponse {
    id: string;
    name: string;
    type: string;
    status: boolean;
    usage_count: number;
    created_at: Date;
    updated_at: Date;
}

const handler = async (req: Request, res: Response) => {
    const { type, status, search, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.max(1, parseInt(limit as string));
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const conditions = [eq(tags.is_deleted, false)];

    // Filter by type
    if (type && typeof type === 'string') {
        conditions.push(eq(tags.type, type));
    }

    // Filter by status
    if (status !== undefined && status !== '') {
        if (status === 'true' || status === 'active') {
            conditions.push(eq(tags.status, true));
        } else if (status === 'false' || status === 'inactive') {
            conditions.push(eq(tags.status, false));
        }
    }

    // Search by name
    if (search && typeof search === 'string') {
        // Using sql like for case-insensitive if basic like isn't sufficient, but standard like is usually fine.
        // For Postgres 'ilike' is better. Since we are using Drizzle, let's try 'ilike' if available or fallback.
        // Assuming Postgres, let's use ilike operator if I imported it? I didn't import ilike.
        // Let's safe bet on `ilike` via sql template or check docs.
        // Actually, let's stick to `like` with % pattern, often case-insensitive depending on collation.
        // Safe bet: LOWER(name) LIKE LOWER(%search%)
        conditions.push(like(tags.name, `%${search}%`));
    }

    // Get total count
    const [totalResult] = await db
        .select({ value: count() })
        .from(tags)
        .where(and(...conditions));

    const total = totalResult.value;

    // Fetch tags
    const tagsList = await db
        .select()
        .from(tags)
        .where(and(...conditions))
        .orderBy(desc(tags.usage_count), tags.name)
        .limit(limitNum)
        .offset(offset);

    const formattedTags: TagResponse[] = tagsList.map(tag => ({
        id: tag.id,
        name: tag.name,
        type: tag.type,
        status: tag.status,
        usage_count: tag.usage_count,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
    }));

    return ResponseFormatter.success(
        res,
        {
            tags: formattedTags,
            total,
            page: pageNum,
            limit: limitNum
        },
        `Found ${formattedTags.length} tags`
    );
};

const router = Router();
router.get('/', handler);

export default router;
