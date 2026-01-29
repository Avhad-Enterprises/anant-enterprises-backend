/**
 * PUT /api/admin/reviews/:id
 * Admin: Moderate a review (approve, reject, add reply)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { reviews } from '../shared/reviews.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const moderateReviewSchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    admin_reply: z.string().max(1000).optional().nullable(),
}).refine(
    data => data.status || data.admin_reply !== undefined,
    { message: 'At least status or admin_reply must be provided' }
);

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    const reviewId = req.params.id as string;

    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const body = moderateReviewSchema.parse(req.body);

    // Get review
    const [review] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);

    if (!review) {
        throw new HttpException(404, 'Review not found');
    }

    // Build update object
    const updateData: Partial<typeof reviews.$inferInsert> = {
        updated_at: new Date(),
    };

    if (body.status) {
        updateData.status = body.status;
    }

    if (body.admin_reply !== undefined) {
        updateData.admin_reply = body.admin_reply;
    }

    // Update review
    await db.update(reviews)
        .set(updateData)
        .where(eq(reviews.id, reviewId));

    // Fetch updated review
    const [updatedReview] = await db
        .select({
            id: reviews.id,
            product_id: reviews.product_id,
            rating: reviews.rating,
            title: reviews.title,
            status: reviews.status,
            admin_reply: reviews.admin_reply,
        })
        .from(reviews)
        .where(eq(reviews.id, reviewId));

    const message = body.status
        ? `Review ${body.status} successfully`
        : 'Review updated successfully';

    return ResponseFormatter.success(res, updatedReview, message);
};

const router = Router();
router.put('/admin/reviews/:id', requireAuth, requirePermission('reviews:update'), handler);

export default router;
