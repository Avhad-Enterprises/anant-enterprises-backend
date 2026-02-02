/**
 * GET /api/products/featured
 * Get all featured products
 * Public endpoint
 */

import { Router, Response, Request } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/products.schema';
import { IProductListItem } from '../shared/responses';
import { reviews } from '../../reviews/shared/reviews.schema';
import {
    buildAverageRating,
    buildReviewCount,
    buildInventoryQuantity,
} from '../shared/query-builders';

const handler = async (req: Request, res: Response) => {
    try {
        // Build query for featured products
        const featuredProducts = await db
            .select({
                id: products.id,
                product_title: products.product_title,
                selling_price: products.selling_price,
                compare_at_price: products.compare_at_price,
                primary_image_url: products.primary_image_url,
                category_tier_1: products.category_tier_1,
                tags: products.tags,
                created_at: products.created_at,
                updated_at: products.updated_at,
                status: products.status,
                featured: products.featured,
                sku: products.sku,
                slug: products.slug,
                short_description: products.short_description,

                // Computed: Inventory Quantity
                                inventory_quantity: buildInventoryQuantity().mapWith(Number),

                                // Computed: Average rating
                                rating: buildAverageRating(),

                                // Computed: Review count
                                review_count: buildReviewCount(),
            })
            .from(products)
            .leftJoin(
                reviews,
                and(
                    eq(reviews.product_id, products.id),
                    eq(reviews.status, 'approved'),
                    eq(reviews.is_deleted, false)
                )
            )
            .where(
                and(
                    eq(products.featured, true),
                    eq(products.status, 'active'),
                    eq(products.is_deleted, false)
                )
            )
            .groupBy(
                products.id,
                products.product_title,
                products.selling_price,
                products.compare_at_price,
                products.primary_image_url,
                products.category_tier_1,
                products.tags,
                products.created_at,
                products.updated_at,
                products.status,
                products.featured,
                products.sku,
                products.slug,
                products.short_description
            )
            .orderBy(desc(products.created_at));

        // Format response
        const formattedProducts: IProductListItem[] = featuredProducts.map(product => {
            const createdDate = new Date(product.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            return {
                id: product.id,
                slug: product.slug,
                name: product.product_title,
                tags: (product.tags as string[]) || [],
                rating: Number(product.rating) || 0,
                reviews: Number(product.review_count) || 0,
                price: Number(product.selling_price),
                originalPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
                image: product.primary_image_url,
                isNew: createdDate > thirtyDaysAgo,
                category: product.category_tier_1?.toLowerCase().replace(/\s+/g, '-') || '',
                technologies: ((product.tags as string[]) || []).map((tag: string) => tag.toLowerCase()),
                description: product.short_description,
                inStock: product.inventory_quantity > 0,
                total_stock: product.inventory_quantity,
            };
        });

        return ResponseFormatter.success(
            res,
            formattedProducts,
            'Featured products retrieved successfully'
        );
    } catch (error: unknown) {
        logger.error('[GET /api/products/featured] Error:', error);
        return ResponseFormatter.error(
            res,
            'FETCH_ERROR',
            'Failed to retrieve featured products',
            500
        );
    }
};

const router = Router();
router.get('/featured', handler);

export default router;
