/**
 * GET /api/tags
 * Get all tags with pagination, filtering and sorting
 * - Supports pagination (page, limit)
 * - Supports filtering by type, status, search
 * - Returns { tags, total, page, limit }
 */

import { Router, Response, Request } from 'express';
import { ResponseFormatter } from '../../../utils';
import { getTagsQuerySchema, queryTags, sanitizeTags, TagType } from '../shared';

const handler = async (req: Request, res: Response) => {
    // Validate and parse query parameters
    const validation = getTagsQuerySchema.safeParse(req.query);
    if (!validation.success) {
        return ResponseFormatter.success(
            res,
            { tags: [], total: 0, page: 1, limit: 10 },
            'Invalid query parameters'
        );
    }

    const { type, status, search, usage, sort, page, limit } = validation.data;

    // Query tags with filters
    const result = await queryTags({
        types: type as TagType[] | undefined,
        statuses: status,
        search,
        usageFilter: usage as 'used' | 'unused' | 'all',
        sort,
        page,
        limit,
    });

    return ResponseFormatter.success(
        res,
        {
            tags: sanitizeTags(result.tags),
            total: result.total,
            page: result.page,
            limit: result.limit,
        },
        `Found ${result.tags.length} tags`
    );
};

const router = Router();
router.get('/', handler);

export default router;
