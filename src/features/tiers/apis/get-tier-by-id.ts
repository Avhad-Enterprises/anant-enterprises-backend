/**
 * GET /api/tiers/:id
 * Get tier by ID with optional children
 * Public endpoint
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';

// Validation schema
const paramsSchema = z.object({
    id: z.string().uuid(),
});

const querySchema = z.object({
    includeChildren: z.enum(['true', 'false']).optional().default('false'),
});

const handler = async (req: Request, res: Response) => {
    // Validate params
    const paramsValidation = paramsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
        throw new HttpException(400, 'Invalid tier ID');
    }

    // Validate query
    const queryValidation = querySchema.safeParse(req.query);
    if (!queryValidation.success) {
        throw new HttpException(400, 'Invalid query parameters');
    }

    const { id } = paramsValidation.data;
    const { includeChildren } = queryValidation.data;

    // Get tier
    const [tier] = await db
        .select()
        .from(tiers)
        .where(eq(tiers.id, id))
        .limit(1);

    if (!tier) {
        throw new HttpException(404, 'Tier not found');
    }

    // Prepare response
    const response: any = {
        id: tier.id,
        name: tier.name,
        code: tier.code,
        description: tier.description,
        level: tier.level,
        parent_id: tier.parent_id,
        priority: tier.priority,
        status: tier.status,
        usage_count: tier.usage_count,
        created_at: tier.created_at,
        updated_at: tier.updated_at,
    };

    // Include children if requested
    if (includeChildren === 'true') {
        const children = await db
            .select()
            .from(tiers)
            .where(eq(tiers.parent_id, id))
            .orderBy(tiers.priority, tiers.name);

        response.children = children.map(child => ({
            id: child.id,
            name: child.name,
            code: child.code,
            level: child.level,
            priority: child.priority,
            status: child.status,
            usage_count: child.usage_count,
        }));
    }

    return ResponseFormatter.success(res, response, 'Tier retrieved successfully');
};

const router = Router();
router.get('/:id', handler);

export default router;
