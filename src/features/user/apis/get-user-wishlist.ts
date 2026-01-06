/**
 * GET /api/users/:userId/wishlist
 * Get user wishlist items
 * - Users can view their own wishlist
 * - Users with users:read permission can view any user's wishlist
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, sql, desc } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema } from '../../../utils';
import { db } from '../../../database';
import { wishlists } from '../../wishlist/shared/wishlist.schema';
import { wishlistItems } from '../../wishlist/shared/wishlist-items.schema';
import { products } from '../../product/shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';
import { inventory } from '../../inventory/shared/inventory.schema';

const paramsSchema = z.object({
  userId: uuidSchema,
});

interface WishlistItemResponse {
  id: string; // Product UUID
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  image: string;
  inStock: boolean;
}

const handler = async (req: RequestWithUser, res: Response) => {
  const { userId } = req.params;

  // Get user's wishlist (may not exist)
  const [userWishlist] = await db
    .select()
    .from(wishlists)
    .where(eq(wishlists.user_id, userId))
    .limit(1);

  // If no wishlist exists, return empty array
  if (!userWishlist) {
    return ResponseFormatter.success(res, [], 'Wishlist retrieved successfully');
  }

  // Get wishlist items with product details and stock info using optimized subquery
  const wishlistData = await db
    .select({
      product_id: wishlistItems.product_id,
      added_at: wishlistItems.added_at,
      product_title: products.product_title,
      selling_price: products.selling_price,
      compare_at_price: products.compare_at_price,
      primary_image_url: products.primary_image_url,
      // Optimized: Get stock in same query using subquery
      total_stock: sql<number>`(
        SELECT COALESCE(SUM(${inventory.available_quantity}), 0)
        FROM ${inventory}
        WHERE ${inventory.product_id} = ${products.id}
      )`,
      // Optimized: Get rating stats in same query
      avg_rating: sql<number>`(
        SELECT COALESCE(AVG(${reviews.rating}), 0)
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,
      review_count: sql<number>`(
        SELECT COUNT(${reviews.id})
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.product_id, products.id))
    .where(and(eq(wishlistItems.wishlist_id, userWishlist.id), eq(products.is_deleted, false)))
    .orderBy(desc(wishlistItems.added_at));

  // Map to frontend response format
  const wishlistResponse: WishlistItemResponse[] = wishlistData.map(item => ({
    id: item.product_id,
    name: item.product_title,
    price: Number(item.selling_price),
    originalPrice: item.compare_at_price
      ? Number(item.compare_at_price)
      : Number(item.selling_price),
    rating: Number(item.avg_rating) || 0,
    reviews: Number(item.review_count) || 0,
    image: item.primary_image_url || '',
    inStock: (item.total_stock || 0) > 0,
  }));

  return ResponseFormatter.success(res, wishlistResponse, 'Wishlist retrieved successfully');
};

const router = Router();
router.get(
  '/:userId/wishlist',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  requireOwnerOrPermission('userId', 'users:read'),
  handler
);

export default router;
