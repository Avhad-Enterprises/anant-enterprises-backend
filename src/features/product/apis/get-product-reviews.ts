/**
 * GET /api/products/:productId/reviews
 * Get product reviews with statistics
 * - Public access (approved reviews only)
 * - Includes: author info, rating distribution, average rating
 * - Supports pagination and sorting
 * - Backend field names preserved for frontend mapping
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { Request } from 'express';
import { ResponseFormatter, paginationSchema, uuidSchema } from '../../../utils';
import { validationMiddleware } from '../../../middlewares';
import { db } from '../../../database';
import { reviews } from '../../reviews/shared/reviews.schema';
import { users } from '../../user/shared/user.schema';

const paramsSchema = z.object({
  productId: uuidSchema,
});

const querySchema = paginationSchema
  .extend({
    sort: z.enum(['recent', 'helpful', 'rating_high', 'rating_low']).default('recent'),
  })
  .refine(data => data.limit <= 50, { message: 'Limit cannot exceed 50 for reviews' });

interface ProductReviewItem {
  // Review fields (backend names)
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  media_urls: string[];
  helpful_votes: number;
  is_verified_purchase: boolean;
  created_at: Date;

  // User fields (from join)
  author_name: string;
  author_avatar: string | null;
}

interface FormattedProductReviewItem extends ProductReviewItem {
  date: string;
  timestamp: string;
  media_urls: string[];
  author_name: string;
}

interface ReviewsResponse {
  reviews: FormattedProductReviewItem[];
  total: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Helper function to format relative date
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSecs < 60) return 'just now';
  if (diffInMins < 60) return `${diffInMins} minute${diffInMins > 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

async function getProductReviews(
  productId: string,
  page: number,
  limit: number,
  sort: string
): Promise<ReviewsResponse> {
  // Determine sort order
  let orderBy;
  switch (sort) {
    case 'helpful':
      orderBy = desc(reviews.helpful_votes);
      break;
    case 'rating_high':
      orderBy = desc(reviews.rating);
      break;
    case 'rating_low':
      orderBy = asc(reviews.rating);
      break;
    case 'recent':
    default:
      orderBy = desc(reviews.created_at);
      break;
  }

  // Get paginated reviews with user info
  const offset = (page - 1) * limit;

  const reviewsList = await db
    .select({
      // Review fields (keep backend names)
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      comment: reviews.comment,
      media_urls: reviews.media_urls,
      helpful_votes: reviews.helpful_votes,
      is_verified_purchase: reviews.is_verified_purchase,
      created_at: reviews.created_at,

      // User fields (from join)
      author_name: users.name,
      author_avatar: users.profile_image_url,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.user_id, users.id))
    .where(
      and(
        eq(reviews.product_id, productId),
        eq(reviews.status, 'approved'),
        eq(reviews.is_deleted, false)
      )
    )
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Get total count
  const [{ count }] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.product_id, productId),
        eq(reviews.status, 'approved'),
        eq(reviews.is_deleted, false)
      )
    );

  const total = Number(count) || 0;

  // Get average rating
  const [{ avg }] = await db
    .select({
      avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.product_id, productId),
        eq(reviews.status, 'approved'),
        eq(reviews.is_deleted, false)
      )
    );

  const averageRating = Number(avg) || 0;

  // Get rating distribution
  const distribution = await db
    .select({
      rating: reviews.rating,
      count: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.product_id, productId),
        eq(reviews.status, 'approved'),
        eq(reviews.is_deleted, false)
      )
    )
    .groupBy(reviews.rating);

  // Build rating distribution object
  const ratingDistribution: ReviewsResponse['ratingDistribution'] = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  distribution.forEach(item => {
    const rating = item.rating as 1 | 2 | 3 | 4 | 5;
    ratingDistribution[rating] = Number(item.count) || 0;
  });

  // Format reviews with relative dates
  const formattedReviews = reviewsList.map(review => ({
    ...review,
    date: getRelativeTime(review.created_at),
    timestamp: review.created_at.toISOString(),
    media_urls: (review.media_urls as string[]) || [],
    author_name: review.author_name || 'Anonymous',
  }));

  return {
    reviews: formattedReviews,
    total,
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    ratingDistribution,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

const handler = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { page, limit, sort } = querySchema.parse(req.query);

  const reviewsData = await getProductReviews(productId, page, limit, sort);

  return ResponseFormatter.success(res, reviewsData, 'Reviews retrieved successfully');
};

const router = Router();
router.get('/:productId/reviews', validationMiddleware(paramsSchema, 'params'), handler);

export default router;
