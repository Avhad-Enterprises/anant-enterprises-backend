import { Router, Response, Request } from 'express';
import { sql, eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { tiers } from '../../tiers/shared/tiers.schema';
import { reviews } from '../../reviews/shared/reviews.schema';

const handler = async (req: Request, res: Response) => {
    try {
        const { categories: categoryCode } = req.query;

        // 1. Determine Parent Tier Context
        let parentTierId = null;
        let parentTierLevel = 0;

        if (categoryCode && typeof categoryCode === 'string') {
            const parentTier = await db.query.tiers.findFirst({
                where: and(
                    eq(tiers.code, categoryCode),
                    eq(tiers.status, 'active')
                ),
                columns: {
                    id: true,
                    level: true
                }
            });

            if (parentTier) {
                parentTierId = parentTier.id;
                parentTierLevel = parentTier.level;
            }
        }

        // 2. Fetch Appropriate Categories (Tiers)
        // If parent context exists, fetch its immediate children.
        // Otherwise, fetch root level (Level 1) tiers.

        const categoriesQuery = db
            .select({
                id: tiers.code,
                label: tiers.name,
                // usage_count: tiers.usage_count // REPLACE stale column with dynamic count
                usage_count: sql<number>`(
                    SELECT COUNT(*)
                    FROM ${products} p
                    WHERE p.status = 'active' 
                    AND p.is_deleted = false
                    AND (
                           p.category_tier_1 = tiers.id
                        OR p.category_tier_2 = tiers.id
                        OR p.category_tier_3 = tiers.id
                        OR p.category_tier_4 = tiers.id
                    )
                )`.mapWith(Number)
            })
            .from(tiers)
            .where(
                and(
                    eq(tiers.status, 'active'),
                    parentTierId
                        ? eq(tiers.parent_id, parentTierId)
                        : eq(tiers.level, 1)
                )
            )
            .orderBy(tiers.priority, tiers.name); // Add sorting for better UX

        const categoriesData = await categoriesQuery;

        // 3. Get Price Range
        const [priceRange] = await db
            .select({
                min: sql<number>`MIN(${products.selling_price})`,
                max: sql<number>`MAX(${products.selling_price})`,
            })
            .from(products)
            .where(sql`${products.status} = 'active' AND ${products.is_deleted} = false`);

        // 4. Technologies Aggregation
        const technologiesData = await db.execute(sql`
        SELECT 
            LOWER(tag) as id, 
            INITCAP(MAX(tag)) as label, 
            COUNT(*) as count
        FROM (
            SELECT jsonb_array_elements_text(COALESCE(${products.tags}, '[]'::jsonb)) as tag
            FROM ${products}
            WHERE ${products.status} = 'active' AND ${products.is_deleted} = false
        ) t
        GROUP BY LOWER(tag)
        ORDER BY count DESC
    `);

        // 5. Ratings (Product level aggregation)
        const ratingCounts = await db.execute(sql`
        WITH product_ratings AS (
            SELECT 
                p.id,
                COALESCE(AVG(r.rating), 0) as avg_rating
            FROM ${products} p
            LEFT JOIN ${reviews} r ON p.id = r.product_id AND r.status = 'approved' AND r.is_deleted = false
            WHERE p.status = 'active' AND p.is_deleted = false
            GROUP BY p.id
        )
        SELECT 
            SUM(CASE WHEN avg_rating >= 4 THEN 1 ELSE 0 END) as count_4_plus,
            SUM(CASE WHEN avg_rating >= 3 THEN 1 ELSE 0 END) as count_3_plus,
            SUM(CASE WHEN avg_rating >= 2 THEN 1 ELSE 0 END) as count_2_plus
        FROM product_ratings
    `);

        const ratingRow = ratingCounts.rows[0] as any;

        const ratings = [
            { value: '4', count: Number(ratingRow?.count_4_plus || 0) },
            { value: '3', count: Number(ratingRow?.count_3_plus || 0) },
            { value: '2', count: Number(ratingRow?.count_2_plus || 0) },
        ];

        return ResponseFormatter.success(
            res,
            {
                categories: categoriesData.map(c => ({
                    id: c.id,
                    label: c.label,
                    count: c.usage_count || 0
                })),
                technologies: technologiesData.rows.map((t: any) => ({
                    id: t.id,
                    label: t.label,
                    count: Number(t.count)
                })),
                ratings,
                priceRange: {
                    min: Number(priceRange?.min || 0),
                    max: Number(priceRange?.max || 200000)
                },
                // Optional: Return context about the current level for UI adjustments
                context: {
                    level: parentTierLevel + 1,
                    parent: categoryCode || null
                }
            },
            'Filter options retrieved successfully'
        );
    } catch (error) {
        return ResponseFormatter.error(
            res,
            'FILTER_FETCH_ERROR',
            error instanceof Error ? error.message : 'Unknown error occurred',
            500
        );
    }
};

const router = Router();
router.get('/filters', handler);

export default router;
