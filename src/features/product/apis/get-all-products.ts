/**
 * GET /api/products
 * Get all products with pagination and advanced filters
 * - Admin: Full access with status filtering
 * - Public: Active products only with collection filters
 */

import { Router, Response, Request } from 'express';
import { eq, sql, and, gte, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';

// Query params validation
const querySchema = z.object({
    // Admin filters
    status: z.enum(['draft', 'active', 'archived', 'schedule']).optional(),
    category_tier_1: z.string().optional(),

    // Public collection filters
    categories: z.string().optional(), // Comma-separated slugs
    technologies: z.string().optional(), // Comma-separated tech IDs (uses tags field)
    ratings: z.string().optional(), // Comma-separated min ratings
    minPrice: z.coerce.number().min(0).default(0),
    maxPrice: z.coerce.number().min(0).default(200000),

    // Sorting
    sort: z.enum(['newest', 'price-asc', 'price-desc', 'rating']).default('newest'),

    // Pagination
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(6),
});

interface CollectionProduct {
    id: string;
    name: string;
    tags: string[] | null;
    rating: number;
    reviews: number;
    price: number;
    originalPrice: number | null;
    image: string | null;
    isNew: boolean;
    category: string;
    technologies: string[];
}

const handler = async (req: Request, res: Response) => {
    const params = querySchema.parse(req.query);

    // Check if request has auth token (admin)
    const authHeader = req.headers['authorization'];
    const isAdmin = authHeader && authHeader.startsWith('Bearer ');

    // Build base conditions
    const conditions = [eq(products.is_deleted, false)];

    // Admin vs Public filtering
    if (isAdmin) {
        // Admin can filter by status
        if (params.status) {
            conditions.push(eq(products.status, params.status));
        }
        if (params.category_tier_1) {
            conditions.push(eq(products.category_tier_1, params.category_tier_1));
        }
    } else {
        // Public: only active products
        conditions.push(eq(products.status, 'active'));
    }

    // Category filter (slugified matching)
    if (params.categories) {
        const categoryList = params.categories.split(',').map(c => c.trim());
        const categoryConditions = categoryList.map(cat =>
            sql`LOWER(REPLACE(${products.category_tier_1}, ' ', '-')) = ${cat.toLowerCase()}`
        );
        if (categoryConditions.length > 0) {
            const orCondition = or(...categoryConditions);
            if (orCondition) {
                conditions.push(orCondition);
            }
        }
    }

    // Technology filter (uses tags field - JSONB array overlap)
    if (params.technologies) {
        const techList = params.technologies.split(',').map(t => t.trim().toLowerCase());
        // Check if any tag in the array matches (case-insensitive)
        const techConditions = techList.map(tech =>
            sql`EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(COALESCE(${products.tags}, '[]'::jsonb)) AS tag
                WHERE LOWER(tag) = ${tech}
            )`
        );
        if (techConditions.length > 0) {
            const orCondition = or(...techConditions);
            if (orCondition) {
                conditions.push(orCondition);
            }
        }
    }

    // Price range filter
    conditions.push(gte(products.selling_price, params.minPrice.toString()));
    conditions.push(lte(products.selling_price, params.maxPrice.toString()));

    const whereClause = and(...conditions);

    // Calculate offset
    const offset = (params.page - 1) * params.limit;

    // Get total count (before GROUP BY) - Note: Using post-filter count for accuracy
    // const totalCount = await db
    //     .select({ total: count(sql`DISTINCT ${products.id}`) })
    //     .from(products)
    //     .leftJoin(reviews, and(
    //         eq(reviews.product_id, products.id),
    //         eq(reviews.status, 'approved'),
    //         eq(reviews.is_deleted, false)
    //     ))
    //     .where(whereClause);

    // Main query with computed fields
    const productsData = await db
        .select({
            id: products.id,
            product_title: products.product_title,
            selling_price: products.selling_price,
            compare_at_price: products.compare_at_price,
            primary_image_url: products.primary_image_url,
            category_tier_1: products.category_tier_1,
            tags: products.tags,
            created_at: products.created_at,

            // Computed: Average rating
            rating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,

            // Computed: Review count
            review_count: sql<number>`COUNT(${reviews.id})`,
        })
        .from(products)
        .leftJoin(reviews, and(
            eq(reviews.product_id, products.id),
            eq(reviews.status, 'approved'),
            eq(reviews.is_deleted, false)
        ))
        .where(whereClause)
        .groupBy(
            products.id,
            products.product_title,
            products.selling_price,
            products.compare_at_price,
            products.primary_image_url,
            products.category_tier_1,
            products.tags,
            products.created_at
        );

    // Apply rating filter using HAVING clause (if specified)
    let filteredProducts = productsData;
    if (params.ratings) {
        const minRatings = params.ratings.split(',').map(r => parseFloat(r.trim()));
        const minRating = Math.min(...minRatings);
        filteredProducts = productsData.filter(p => Number(p.rating) >= minRating);
    }

    // Apply sorting
    filteredProducts.sort((a, b) => {
        switch (params.sort) {
            case 'newest':
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'price-asc':
                return Number(a.selling_price) - Number(b.selling_price);
            case 'price-desc':
                return Number(b.selling_price) - Number(a.selling_price);
            case 'rating':
                return Number(b.rating) - Number(a.rating);
            default:
                return 0;
        }
    });

    // Apply pagination
    const paginatedProducts = filteredProducts.slice(offset, offset + params.limit);

    // Format response with field mapping
    const formattedProducts: CollectionProduct[] = paginatedProducts.map(product => {
        const createdDate = new Date(product.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return {
            id: product.id,
            name: product.product_title,
            tags: (product.tags as any) || [],
            rating: Number(product.rating) || 0,
            reviews: Number(product.review_count) || 0,
            price: Number(product.selling_price),
            originalPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
            image: product.primary_image_url,
            isNew: createdDate > thirtyDaysAgo,
            category: product.category_tier_1?.toLowerCase().replace(/\s+/g, '-') || '',
            technologies: ((product.tags as any) || []).map((tag: string) => tag.toLowerCase()),
        };
    });

    // Calculate total pages
    const totalPages = Math.ceil(filteredProducts.length / params.limit);

    return ResponseFormatter.success(res, {
        products: formattedProducts,
        total: filteredProducts.length,
        totalPages,
        currentPage: params.page,
    }, 'Products retrieved successfully');
};

const router = Router();
// Public endpoint - no authentication required
router.get('/', handler);

export default router;
