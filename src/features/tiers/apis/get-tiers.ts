/**
 * GET /api/tiers
 * Get all tiers/categories (Public endpoint)
 */

import { Router, Response, Request } from 'express';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { eq, asc, and } from 'drizzle-orm';

interface TierResponse {
    id: string;
    name: string;
    code: string;
    description: string | null;
    level: number;
    parent_id: string | null;
    priority: number;
    status: string;
}

const handler = async (req: Request, res: Response) => {
    const { level } = req.query;

    // Build where conditions
    const conditions = [eq(tiers.status, 'active')];

    // Add level filter if specified
    if (level) {
        const levelNum = parseInt(level as string, 10);
        if (!isNaN(levelNum)) {
            conditions.push(eq(tiers.level, levelNum));
        }
    }

    // Execute query with all conditions
    const allTiers = await db
        .select()
        .from(tiers)
        .where(and(...conditions))
        .orderBy(asc(tiers.level), asc(tiers.priority), asc(tiers.name));

    const tiersResponse: TierResponse[] = allTiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        code: tier.code,
        description: tier.description,
        level: tier.level,
        parent_id: tier.parent_id,
        priority: tier.priority,
        status: tier.status,
    }));

    ResponseFormatter.success(res, tiersResponse, 'Tiers retrieved successfully');
};

const router = Router();
router.get('/', handler);

export default router;
