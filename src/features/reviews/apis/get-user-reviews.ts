/**
 * GET /api/reviews/me
 * Get user's submitted reviews with status
 */

import { Router, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { reviews } from '../shared/reviews.schema';
import { products } from '../../product/shared/products.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Get user's reviews with product info
    const userReviews = await db
        .select({
            id: reviews.id,
            product_id: reviews.product_id,
            product_name: products.product_title,
            product_image: products.primary_image_url,
            rating: reviews.rating,
            title: reviews.title,
            comment: reviews.comment,
            media_urls: reviews.media_urls,
            is_verified_purchase: reviews.is_verified_purchase,
            status: reviews.status,
            admin_reply: reviews.admin_reply,
            helpful_votes: reviews.helpful_votes,
            created_at: reviews.created_at,
        })
        .from(reviews)
        .leftJoin(products, eq(reviews.product_id, products.id))
        .where(eq(reviews.user_id, userId))
        .orderBy(desc(reviews.created_at));

    // Group by status for convenience
    const pending = userReviews.filter(r => r.status === 'pending');
    const approved = userReviews.filter(r => r.status === 'approved');
    const rejected = userReviews.filter(r => r.status === 'rejected');

    return ResponseFormatter.success(res, {
        reviews: userReviews,
        summary: {
            total: userReviews.length,
            pending: pending.length,
            approved: approved.length,
            rejected: rejected.length,
        },
    }, 'Reviews retrieved successfully');
};

const router = Router();
router.get('/me', requireAuth, handler);

export default router;
