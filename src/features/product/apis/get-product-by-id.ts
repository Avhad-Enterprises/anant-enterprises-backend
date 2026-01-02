/**
 * GET /api/products/:id
 * Get product detail with enhanced frontend-compatible response
 * - Public can view active products
 * - Admins can view all products
 * - Includes computed fields: rating, reviews, inStock, discount
 * - Maps backend schema to frontend without changing field names
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { rbacCacheService } from '../../rbac';

const paramsSchema = z.object({
    id: z.string().uuid('Invalid product ID format'),
});

interface ProductDetailResponse {
    // Core product fields (keep backend names)
    id: string;
    slug: string;
    product_title: string;
    secondary_title: string | null;
    short_description: string | null;
    full_description: string | null;
    status: string;

    // Pricing
    cost_price: string;
    selling_price: string;
    compare_at_price: string | null;

    // Computed: Discount percentage
    discount: number | null;

    // Inventory
    sku: string;
    barcode: string | null;

    // Computed: Stock availability
    inStock: boolean;
    total_stock: number;

    // Media
    primary_image_url: string | null;
    additional_images: string[];
    // Combined images array
    images: string[];

    // Categorization
    category_tier_1: string | null;
    category_tier_2: string | null;
    category_tier_3: string | null;

    // Computed: Reviews
    rating: number;
    review_count: number;

    // Timestamps
    created_at: Date;
    updated_at: Date;
}

async function getProductDetailById(id: string, userId?: string): Promise<ProductDetailResponse> {
    // Fetch product with computed fields using optimized subqueries
    const [productData] = await db
        .select({
            // All product fields
            id: products.id,
            slug: products.slug,
            product_title: products.product_title,
            secondary_title: products.secondary_title,
            short_description: products.short_description,
            full_description: products.full_description,
            status: products.status,
            cost_price: products.cost_price,
            selling_price: products.selling_price,
            compare_at_price: products.compare_at_price,
            sku: products.sku,
            barcode: products.barcode,
            primary_image_url: products.primary_image_url,
            additional_images: products.additional_images,
            category_tier_1: products.category_tier_1,
            category_tier_2: products.category_tier_2,
            category_tier_3: products.category_tier_3,
            created_at: products.created_at,
            updated_at: products.updated_at,

            // Computed: Total stock from inventory
            total_stock: sql<number>`(
        SELECT COALESCE(SUM(${inventory.available_quantity}), 0)
        FROM ${inventory}
        WHERE ${inventory.product_id} = ${products.id}
      )`,

            // Computed: Average rating from reviews
            avg_rating: sql<number>`(
        SELECT COALESCE(AVG(${reviews.rating}), 0)
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,

            // Computed: Review count
            review_count: sql<number>`(
        SELECT COUNT(${reviews.id})
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,
        })
        .from(products)
        .where(
            and(
                eq(products.id, id),
                eq(products.is_deleted, false)
            )
        )
        .limit(1);

    if (!productData) {
        throw new HttpException(404, 'Product not found');
    }

    // Check if product is viewable
    if (productData.status !== 'active') {
        if (!userId) {
            throw new HttpException(401, 'Authentication required to view this product');
        }

        const hasPermission = await rbacCacheService.hasPermission(userId, 'products:read');
        if (!hasPermission) {
            throw new HttpException(403, 'You do not have permission to view draft/archived products');
        }
    }

    // Calculate discount percentage
    let discount: number | null = null;
    if (productData.compare_at_price && productData.selling_price) {
        const comparePrice = Number(productData.compare_at_price);
        const sellPrice = Number(productData.selling_price);
        if (comparePrice > sellPrice) {
            discount = Math.round(((comparePrice - sellPrice) / comparePrice) * 100);
        }
    }

    // Combine images (primary + additional)
    const images: string[] = [];
    if (productData.primary_image_url) {
        images.push(productData.primary_image_url);
    }
    if (productData.additional_images && Array.isArray(productData.additional_images)) {
        images.push(...productData.additional_images);
    }

    // Build response
    const response: ProductDetailResponse = {
        // Core fields
        id: productData.id,
        slug: productData.slug,
        product_title: productData.product_title,
        secondary_title: productData.secondary_title,
        short_description: productData.short_description,
        full_description: productData.full_description,
        status: productData.status,

        // Pricing
        cost_price: productData.cost_price,
        selling_price: productData.selling_price,
        compare_at_price: productData.compare_at_price,
        discount,

        // Inventory
        sku: productData.sku,
        barcode: productData.barcode,
        inStock: (productData.total_stock || 0) > 0,
        total_stock: Number(productData.total_stock) || 0,

        // Media
        primary_image_url: productData.primary_image_url,
        additional_images: (productData.additional_images as string[]) || [],
        images,

        // Categories
        category_tier_1: productData.category_tier_1,
        category_tier_2: productData.category_tier_2,
        category_tier_3: productData.category_tier_3,

        // Reviews
        rating: Number(productData.avg_rating) || 0,
        review_count: Number(productData.review_count) || 0,

        // Timestamps
        created_at: productData.created_at,
        updated_at: productData.updated_at,
    };

    return response;
}

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = req.params;
    const userId = req.userId; // May be undefined for public access

    const productDetail = await getProductDetailById(id, userId);

    return ResponseFormatter.success(res, productDetail, 'Product retrieved successfully');
};

const router = Router();
router.get(
    '/:id',
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
