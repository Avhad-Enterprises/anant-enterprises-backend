/**
 * GET /api/admin/reviews
 * Admin: Get all reviews with filters
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc, count, gte, lte } from 'drizzle-orm';
import { ResponseFormatter, paginationSchema } from '../../../utils';
import { db } from '../../../database';
import { reviews } from '../shared/reviews.schema';
import { products } from '../../product/shared/product.schema';
import { users } from '../../user/shared/user.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const querySchema = paginationSchema.extend({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    product_id: z.string().uuid().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    is_verified: z.coerce.boolean().optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const params = querySchema.parse(req.query);
    const offset = (params.page - 1) * params.limit;

    // Build where conditions
    const conditions = [];

    if (params.status) {
        conditions.push(eq(reviews.status, params.status));
    }

    if (params.product_id) {
        conditions.push(eq(reviews.product_id, params.product_id));
    }

    if (params.rating) {
        conditions.push(eq(reviews.rating, params.rating));
    }

    if (params.is_verified !== undefined) {
        conditions.push(eq(reviews.is_verified_purchase, params.is_verified));
    }

    if (params.from_date) {
        conditions.push(gte(reviews.created_at, new Date(params.from_date)));
    }

    if (params.to_date) {
        conditions.push(lte(reviews.created_at, new Date(params.to_date)));
    }

    // Get total count
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
        .select({ total: count() })
        .from(reviews)
        .where(whereClause);

    const total = countResult?.total || 0;

    // Get reviews with product and user info
    const adminReviews = await db
        .select({
            id: reviews.id,
            product_id: reviews.product_id,
            product_name: products.product_title,
            user_id: reviews.user_id,
            user_name: users.name,
            user_email: users.email,
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
        .leftJoin(users, eq(reviews.user_id, users.id))
        .where(whereClause)
        .orderBy(desc(reviews.created_at))
        .limit(params.limit)
        .offset(offset);

    // Get counts by status for dashboard
    const statusCounts = await db
        .select({
            status: reviews.status,
            count: count(),
        })
        .from(reviews)
        .groupBy(reviews.status);

    const summary = {
        pending: statusCounts.find(s => s.status === 'pending')?.count || 0,
        approved: statusCounts.find(s => s.status === 'approved')?.count || 0,
        rejected: statusCounts.find(s => s.status === 'rejected')?.count || 0,
    };

    return ResponseFormatter.success(res, {
        reviews: adminReviews,
        summary,
        pagination: {
            page: params.page,
            limit: params.limit,
            total,
            totalPages: Math.ceil(total / params.limit),
        },
    }, 'Reviews retrieved successfully');
};

const router = Router();
router.get('/admin/reviews', requireAuth, requirePermission('reviews:read'), handler);

export default router;
