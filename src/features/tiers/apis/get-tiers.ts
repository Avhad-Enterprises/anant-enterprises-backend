/**
 * GET /api/tiers
 * Get all tiers/categories (Public endpoint)
 */

import { Router, Response, Request } from 'express';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { ITier } from '../shared/interface';
import { eq, asc, and, or, like, gt } from 'drizzle-orm';

const handler = async (req: Request, res: Response) => {
    const { level, status, parentId, search, usage } = req.query;

    // Build where conditions
    const conditions = [];

    // Always exclude deleted tiers
    conditions.push(eq(tiers.is_deleted, false));

    // Add status filter if specified (don't default to active)
    if (status && status !== '') {
        conditions.push(eq(tiers.status, status as 'active' | 'inactive'));
    }

    // Add level filter if specified
    if (level) {
        const levelNum = parseInt(level as string, 10);
        if (!isNaN(levelNum)) {
            conditions.push(eq(tiers.level, levelNum));
        }
    }

    // Add parent filter if specified
    if (parentId) {
        conditions.push(eq(tiers.parent_id, parentId as string));
    }

    // Add search filter if specified
    if (search && typeof search === 'string') {
        const searchTerm = `%${search}%`;
        conditions.push(
            or(
                like(tiers.name, searchTerm),
                like(tiers.code, searchTerm)
            )
        );
    }

    // Add usage filter
    if (usage && typeof usage === 'string') {
        if (usage === 'used') {
            conditions.push(gt(tiers.usage_count, 0));
        } else if (usage === 'unused') {
            conditions.push(eq(tiers.usage_count, 0));
        }
    }

    // Execute query with all conditions
    const query = conditions.length > 0
        ? db.select().from(tiers).where(and(...conditions))
        : db.select().from(tiers);

    const allTiers = await query.orderBy(asc(tiers.level), asc(tiers.name));

    const tiersResponse: ITier[] = allTiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        code: tier.code,
        description: tier.description,
        level: tier.level,
        parent_id: tier.parent_id,
        status: tier.status,
        usage_count: tier.usage_count,
        created_at: tier.created_at,
        updated_at: tier.updated_at,
    }));

    ResponseFormatter.success(res, tiersResponse, 'Tiers retrieved successfully');
};

const router = Router();
router.get('/', handler);

export default router;
