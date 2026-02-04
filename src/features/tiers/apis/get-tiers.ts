/**
 * GET /api/tiers
 * Get all tiers/categories (Public endpoint)
 */

import { Router, Response, Request } from 'express';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { ITier } from '../shared/interface';
import { eq, asc, and, or, gt, inArray } from 'drizzle-orm';
import { buildTierSearchConditions } from '../shared/search-utils';

const handler = async (req: Request, res: Response) => {
    const { level, status, parentId, search, usage } = req.query;

    // Build where conditions
    const conditions = [];

    // Always exclude deleted tiers
    conditions.push(eq(tiers.is_deleted, false));

    // Add status filter if specified (support multi-select)
    if (status && typeof status === 'string') {
        const statuses = status.split(',').filter(s => s === 'active' || s === 'inactive');
        if (statuses.length > 0) {
            conditions.push(inArray(tiers.status, statuses as ('active' | 'inactive')[]));
        }
    }

    // Add level filter if specified (support multi-select)
    if (level && typeof level === 'string') {
        const levels = level.split(',').map(l => parseInt(l, 10)).filter(n => !isNaN(n));
        if (levels.length > 0) {
            conditions.push(inArray(tiers.level, levels));
        }
    }

    // Add parent filter if specified
    if (parentId) {
        conditions.push(eq(tiers.parent_id, parentId as string));
    }

    // Fuzzy Search Filter (using pg_trgm similarity)
    if (search && typeof search === 'string' && search.trim().length > 0) {
        const searchConditions = buildTierSearchConditions(search);
        if (searchConditions) {
            conditions.push(searchConditions);
        }
    }

    // Add usage filter (support multi-select)
    if (usage && typeof usage === 'string') {
        const usageOptions = usage.split(',').filter(Boolean);
        const usageConditions = [];

        if (usageOptions.includes('used')) {
            usageConditions.push(gt(tiers.usage_count, 0));
        }
        if (usageOptions.includes('unused')) {
            usageConditions.push(eq(tiers.usage_count, 0));
        }

        if (usageConditions.length > 0) {
            conditions.push(or(...usageConditions));
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
