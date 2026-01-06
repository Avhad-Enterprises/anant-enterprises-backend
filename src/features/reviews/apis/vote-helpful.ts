/**
 * POST /api/reviews/:id/helpful
 * Vote a review as helpful
 * - Prevents duplicate votes per user
 */

import { Router, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { reviews } from '../shared/reviews.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

// In-memory store for vote tracking (should be moved to DB for production)
const userVotes = new Map<string, Set<string>>(); // userId -> Set<reviewId>

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    const reviewId = req.params.id;

    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Get review
    const [review] = await db
        .select({
            id: reviews.id,
            user_id: reviews.user_id,
            status: reviews.status,
            helpful_votes: reviews.helpful_votes,
        })
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);

    if (!review) {
        throw new HttpException(404, 'Review not found');
    }

    // Can't vote on non-approved reviews
    if (review.status !== 'approved') {
        throw new HttpException(400, 'Cannot vote on pending or rejected reviews');
    }

    // Can't vote on own review
    if (review.user_id === userId) {
        throw new HttpException(400, 'Cannot vote on your own review');
    }

    // Check if user already voted (in-memory check)
    const userVoteSet = userVotes.get(userId) || new Set();
    if (userVoteSet.has(reviewId)) {
        throw new HttpException(400, 'You have already voted on this review');
    }

    // Increment helpful votes
    await db.update(reviews)
        .set({
            helpful_votes: sql`${reviews.helpful_votes} + 1`,
            updated_at: new Date(),
        })
        .where(eq(reviews.id, reviewId));

    // Record vote
    userVoteSet.add(reviewId);
    userVotes.set(userId, userVoteSet);

    return ResponseFormatter.success(res, {
        review_id: reviewId,
        new_vote_count: review.helpful_votes + 1,
    }, 'Vote recorded successfully');
};

const router = Router();
router.post('/:id/helpful', requireAuth, handler);

export default router;
