/**
 * GET /api/collections/:slug/products
 * Get products within a specific collection
 * - Public access
 * - Returns collection info + products
 * - Respects manual ordering (position)
 * - Pagination support
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, sql, count } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { collectionProducts } from '../shared/collection-products.schema';
import { products } from '../../product/shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';

const paramsSchema = z.object({
    slug: z.string().min(1, 'Slug is required'),
});

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
});

interface CollectionProductItem {
    id: string;
    name: string;
    price: number;
    originalPrice: number | null;
    image: string | null;
    rating: number;
    reviews: number;
    inStock: boolean;
}

const handler = async (req: Request, res: Response) => {
    const { slug } = paramsSchema.parse(req.params);
    const { page, limit } = querySchema.parse(req.query);

    // Get collection
    const [collection] = await db
        .select({
            id: collections.id,
            title: collections.title,
            slug: collections.slug,
            description: collections.description,
        })
        .from(collections)
        .where(and(
            eq(collections.slug, slug),
            eq(collections.status, 'active')
        ))
        .limit(1);

    if (!collection) {
        throw new HttpException(404, 'Collection not found');
    }

    // Get total product count
    const [countResult] = await db
        .select({ total: count() })
        .from(collectionProducts)
        .innerJoin(products, eq(products.id, collectionProducts.product_id))
        .where(and(
            eq(collectionProducts.collection_id, collection.id),
            eq(products.status, 'active'),
            eq(products.is_deleted, false)
        ));

    const total = countResult?.total ?? 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Get products with ratings
    const productsData = await db
        .select({
            id: products.id,
            product_title: products.product_title,
            selling_price: products.selling_price,
            compare_at_price: products.compare_at_price,
            primary_image_url: products.primary_image_url,
            position: collectionProducts.position,

            // Computed: Average rating
            rating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,

            // Computed: Review count
            review_count: sql<number>`COUNT(${reviews.id})`,
        })
        .from(collectionProducts)
        .innerJoin(products, eq(products.id, collectionProducts.product_id))
        .leftJoin(reviews, and(
            eq(reviews.product_id, products.id),
            eq(reviews.status, 'approved'),
            eq(reviews.is_deleted, false)
        ))
        .where(and(
            eq(collectionProducts.collection_id, collection.id),
            eq(products.status, 'active'),
            eq(products.is_deleted, false)
        ))
        .groupBy(
            products.id,
            products.product_title,
            products.selling_price,
            products.compare_at_price,
            products.primary_image_url,
            collectionProducts.position
        )
        .orderBy(collectionProducts.position)
        .limit(limit)
        .offset(offset);

    // Format products
    const formattedProducts: CollectionProductItem[] = productsData.map(product => ({
        id: product.id,
        name: product.product_title,
        price: Number(product.selling_price),
        originalPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
        image: product.primary_image_url,
        rating: Number(product.rating) || 0,
        reviews: Number(product.review_count) || 0,
        inStock: true, // TODO: Join with inventory if needed
    }));

    return ResponseFormatter.success(res, {
        collection: {
            id: collection.id,
            title: collection.title,
            slug: collection.slug,
            description: collection.description,
        },
        products: formattedProducts,
        total,
        totalPages,
        currentPage: page,
    }, 'Collection products retrieved successfully');
};

const router = Router();
router.get('/:slug/products', handler);

export default router;
