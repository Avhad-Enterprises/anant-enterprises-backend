/**
 * GET /api/products
 * Get all products with pagination and filters (Admin only)
 */

import { Router, Response } from 'express';
import { eq, count, sql, and } from 'drizzle-orm';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { sanitizeProducts } from '../shared/sanitizeProduct';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { IProduct } from '../shared/interface';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query params validation
const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    status: z.enum(['draft', 'active', 'archived', 'schedule']).optional(),
    category_tier_1: z.string().optional(),
});

interface PaginatedProducts {
    products: IProduct[];
    total: number;
    page: number;
    limit: number;
}

async function getAllProducts(
    page: number,
    limit: number,
    status?: string,
    categoryTier1?: string
): Promise<PaginatedProducts> {
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(products.is_deleted, false)];

    if (status) {
        conditions.push(eq(products.status, status as any));
    }

    if (categoryTier1) {
        conditions.push(eq(products.category_tier_1, categoryTier1));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get total count
    const [countResult] = await db
        .select({ total: count() })
        .from(products)
        .where(whereClause);

    const total = countResult?.total ?? 0;

    // Get paginated products
    const allProducts = await db
        .select()
        .from(products)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(sql`${products.created_at} DESC`);

    return {
        products: allProducts as IProduct[],
        total,
        page,
        limit,
    };
}

const handler = async (req: RequestWithUser, res: Response) => {
    // Parse and validate query params
    const { page, limit, status, category_tier_1 } = paginationSchema.parse(req.query);

    const result = await getAllProducts(page, limit, status, category_tier_1);
    const sanitizedProducts = sanitizeProducts(result.products);

    ResponseFormatter.paginated(
        res,
        sanitizedProducts,
        { page: result.page, limit: result.limit, total: result.total },
        'Products retrieved successfully'
    );
};

const router = Router();
router.get('/', requireAuth, requirePermission('products:read'), handler);

export default router;
