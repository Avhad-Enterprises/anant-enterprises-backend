/**
 * GET /api/tiers/hierarchy
 * Get full tier tree structure
 * Public endpoint
 */

import { Router, Response, Request } from 'express';
import { asc, eq } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { Tier } from '../shared/tiers.schema';

interface TierNode {
    id: string;
    name: string;
    code: string;
    description: string | null;
    level: number;
    status: 'active' | 'inactive';
    usage_count: number;
    children: TierNode[];
}

/**
 * Build hierarchical tree from flat tier list
 */
function buildHierarchy(allTiers: Tier[]): TierNode[] {
    const tierMap = new Map<string, TierNode>();
    const rootTiers: TierNode[] = [];

    // First pass: Create all nodes
    allTiers.forEach(tier => {
        tierMap.set(tier.id, {
            id: tier.id,
            name: tier.name,
            code: tier.code,
            description: tier.description,
            level: tier.level,
            status: tier.status,
            usage_count: tier.usage_count,
            children: [],
        });
    });

    // Second pass: Build tree structure
    allTiers.forEach(tier => {
        const node = tierMap.get(tier.id)!;

        if (tier.parent_id) {
            const parent = tierMap.get(tier.parent_id);
            if (parent) {
                parent.children.push(node);
            }
        } else {
            // Root tier (no parent)
            rootTiers.push(node);
        }
    });

    // Sort children at each level by name
    const sortChildren = (node: TierNode) => {
        node.children.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortChildren);
    };

    rootTiers.forEach(sortChildren);

    return rootTiers;
}

const handler = async (req: Request, res: Response) => {
    // Get all tiers (including inactive, excluding deleted)
    const allTiers = await db
        .select()
        .from(tiers)
        .where(eq(tiers.is_deleted, false))
        .orderBy(asc(tiers.level), asc(tiers.name));

    // Build hierarchical structure
    const hierarchy = buildHierarchy(allTiers);

    return ResponseFormatter.success(
        res,
        { tiers: hierarchy },
        'Tier hierarchy retrieved successfully'
    );
};

const router = Router();
router.get('/hierarchy', handler);

export default router;
