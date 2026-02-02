/**
 * POST /api/reviews
 * Submit a product review
 * - Requires authentication
 * - Validates user has purchased product (for verified badge)
 * - Default status: pending (requires moderation)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { reviews } from '../shared/reviews.schema';
import { products } from '../../product/shared/products.schema';
import { orderItems } from '../../orders/shared/order-items.schema';
import { orders } from '../../orders/shared/orders.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

// Validation schema
const createReviewSchema = z.object({
    product_id: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    title: z.string().min(3).max(200).optional(),
    comment: z.string().min(10).max(2000).optional(),
    media_urls: z.array(z.string().url()).max(5).optional().default([]),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const body = createReviewSchema.parse(req.body);

    // Validate product exists and is active
    const [product] = await db
        .select({
            id: products.id,
            product_title: products.product_title,
            status: products.status,
        })
        .from(products)
        .where(and(
            eq(products.id, body.product_id),
            eq(products.is_deleted, false)
        ))
        .limit(1);

    if (!product) {
        throw new HttpException(404, 'Product not found');
    }

    // Check if user already reviewed this product
    const [existingReview] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(and(
            eq(reviews.product_id, body.product_id),
            eq(reviews.user_id, userId)
        ))
        .limit(1);

    if (existingReview) {
        throw new HttpException(400, 'You have already reviewed this product');
    }

    // Check if user has purchased the product (for verified badge)
    const purchaseResult = await db
        .select({ order_id: orderItems.order_id })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.order_id, orders.id))
        .where(and(
            eq(orderItems.product_id, body.product_id),
            eq(orders.user_id, userId),
            eq(orders.order_status, 'delivered')
        ))
        .limit(1);

    const isVerifiedPurchase = purchaseResult.length > 0;

    // Create review
    const [review] = await db.insert(reviews).values({
        product_id: body.product_id,
        user_id: userId,
        rating: body.rating,
        title: body.title,
        comment: body.comment,
        media_urls: body.media_urls,
        is_verified_purchase: isVerifiedPurchase,
        status: 'pending', // All reviews go through moderation
        helpful_votes: 0,
    }).returning();

    if (!review) {
        throw new HttpException(500, 'Failed to create review');
    }

    return ResponseFormatter.success(res, {
        id: review.id,
        product_id: review.product_id,
        rating: review.rating,
        is_verified_purchase: review.is_verified_purchase,
        status: review.status,
    }, 'Review submitted successfully. It will be visible after moderation.', 201);
};

const router = Router();
router.post('/', requireAuth, handler);

export default router;
