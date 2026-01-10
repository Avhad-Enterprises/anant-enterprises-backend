/**
 * POST /api/tiers
 * Create a new tier
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Validation schema
const createTierSchema = z.object({
    name: z.string().min(1).max(255).trim(),
    code: z.string().min(1).max(255).trim().optional(),
    description: z.string().optional(),
    level: z.number().int().min(1).max(4),
    parent_id: z.string().uuid().optional(),
    status: z.enum(['active', 'inactive']).default('active'),
});

/**
 * Generate URL-friendly code from name
 */
function generateCode(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/--+/g, '-')      // Replace multiple hyphens with single
        .replace(/^-+|-+$/g, '');  // Trim hyphens from start/end
}

const handler = async (req: RequestWithUser, res: Response) => {
    // Validate request body
    const validation = createTierSchema.safeParse(req.body);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid request data');
    }

    const data = validation.data;

    // Generate code if not provided
    const code = data.code || generateCode(data.name);

    // Check code uniqueness
    const existingCode = await db
        .select()
        .from(tiers)
        .where(eq(tiers.code, code))
        .limit(1);

    if (existingCode.length > 0) {
        throw new HttpException(409, `Tier with code "${code}" already exists`);
    }

    // Validate hierarchy if parent_id is provided
    if (data.parent_id) {
        const [parent] = await db
            .select()
            .from(tiers)
            .where(and(
                eq(tiers.id, data.parent_id),
                eq(tiers.status, 'active')
            ))
            .limit(1);

        if (!parent) {
            throw new HttpException(404, 'Parent tier not found or inactive');
        }

        // Validate level hierarchy: child level must be parent level + 1
        if (data.level !== parent.level + 1) {
            throw new HttpException(
                400,
                `Invalid level. Child tier must be level ${parent.level + 1} (parent is level ${parent.level})`
            );
        }
    } else {
        // No parent_id: must be root tier (level 1)
        if (data.level !== 1) {
            throw new HttpException(400, 'Root tier must be level 1');
        }
    }

    // Create tier
    const [newTier] = await db
        .insert(tiers)
        .values({
            name: data.name,
            code: code,
            description: data.description || null,
            level: data.level,
            parent_id: data.parent_id || null,
            status: data.status,
            usage_count: 0,
        })
        .returning();

    return ResponseFormatter.success(
        res,
        {
            id: newTier.id,
            name: newTier.name,
            code: newTier.code,
            description: newTier.description,
            level: newTier.level,
            parent_id: newTier.parent_id,
            status: newTier.status,
            usage_count: newTier.usage_count,
            created_at: newTier.created_at,
        },
        'Tier created successfully',
        201
    );
};

const router = Router();
router.post('/', requireAuth, requirePermission('tiers:create'), handler);

export default router;
