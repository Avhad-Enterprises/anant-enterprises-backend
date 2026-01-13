import { Router, Response, Request } from 'express';
import { sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { tiers } from '../../tiers/shared/tiers.schema';
import { reviews } from '../../reviews/shared/reviews.schema';

const handler = async (req: Request, res: Response) => {
    try {
        // 1. Get Categories (Level 1 Tiers)
        const categoriesData = await db
            .select({
                id: tiers.code,
                label: tiers.name,
            })
            .from(tiers)
            .where(sql`${tiers.level} = 1 AND ${tiers.status} = 'active'`);

        // 2. Get Price Range
        const [priceRange] = await db
            .select({
                min: sql<number>`MIN(${products.selling_price})`,
                max: sql<number>`MAX(${products.selling_price})`,
            })
            .from(products)
            .where(sql`${products.status} = 'active' AND ${products.is_deleted} = false`);

        // 3. Technologies Aggregation
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

        // 4. Ratings (Product level aggregation)
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
                    count: 0 // Categories count requires more complex join, skipping for now
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
                }
            },
            'Filter options retrieved successfully'
        );
    } catch (error) {
        console.error('Error fetching filter options:', error);
        return ResponseFormatter.error(res, error as Error);
    }
};

const router = Router();
router.get('/filters', handler);

export default router;
