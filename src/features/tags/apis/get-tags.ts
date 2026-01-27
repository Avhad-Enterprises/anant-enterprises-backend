/**
 * GET /api/tags
 * Get all tags with pagination, filtering and sorting
 * - Supports pagination (page, limit)
 * - Supports filtering by type, status, search
 * - Returns { tags, total, page, limit }
 */

import { Router, Response, Request } from 'express';
import { eq, and, desc, asc, like, count, gt } from 'drizzle-orm';
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
    const { type, status, search, sort, page = '1', limit = '10' } = req.query;

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
        conditions.push(like(tags.name, `%${search}%`));
    }

    // Filter by usage
    const usage = req.query.usage as string;
    if (usage) {
        if (usage === 'used') {
            conditions.push(gt(tags.usage_count, 0));
        } else if (usage === 'unused') {
            conditions.push(eq(tags.usage_count, 0));
        }
    }

    // Get total count
    const [totalResult] = await db
        .select({ value: count() })
        .from(tags)
        .where(and(...conditions));

    const total = totalResult.value;

    // Determine sort order
    let orderBy = [desc(tags.created_at)]; // Default to newest
    if (sort === 'oldest') {
        orderBy = [asc(tags.created_at)];
    } else if (sort === 'name_asc') {
        orderBy = [asc(tags.name)];
    } else if (sort === 'name_desc') {
        orderBy = [desc(tags.name)];
    } else if (sort === 'usage_high') {
        orderBy = [desc(tags.usage_count)];
    } else if (sort === 'usage_low') {
        orderBy = [asc(tags.usage_count)];
    } else if (sort === 'updated_desc') {
        orderBy = [desc(tags.updated_at)];
    } else if (sort === 'updated_asc') {
        orderBy = [asc(tags.updated_at)];
    } else if (sort === 'type_asc') {
        orderBy = [asc(tags.type)];
    } else if (sort === 'type_desc') {
        orderBy = [desc(tags.type)];
    } else if (sort === 'status_asc') {
        orderBy = [asc(tags.status)]; // false (inactive) first? depends on db, usually false < true
    } else if (sort === 'status_desc') {
        orderBy = [desc(tags.status)];
    }

    // Fetch tags
    const tagsList = await db
        .select()
        .from(tags)
        .where(and(...conditions))
        .orderBy(...orderBy)
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
