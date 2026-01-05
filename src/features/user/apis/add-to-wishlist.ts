/**
 * POST /api/users/:userId/wishlist/:productId
 * Add product to wishlist
 * - Users can add to their own wishlist
 * - Users with users:write permission can add to any user's wishlist
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException, uuidSchema } from '../../../utils';
import { db } from '../../../database';
import { wishlists } from '../../wishlist/shared/wishlist.schema';
import { wishlistItems } from '../../wishlist/shared/wishlist-items.schema';
import { products } from '../../product/shared/product.schema';

const paramsSchema = z.object({
  userId: uuidSchema,
  productId: uuidSchema,
});

const handler = async (req: RequestWithUser, res: Response) => {
  const { userId, productId } = req.params;

  // Verify product exists
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.is_deleted, false)));

  if (!product) {
    throw new HttpException(404, 'Product not found');
  }

  // Get or create user's wishlist
  let [userWishlist] = await db
    .select()
    .from(wishlists)
    .where(eq(wishlists.user_id, userId))
    .limit(1);

  if (!userWishlist) {
    // Create wishlist for user
    [userWishlist] = await db
      .insert(wishlists)
      .values({
        user_id: userId,
        status: true,
      })
      .returning();
  }

  // Check if product already in wishlist
  const [existing] = await db
    .select()
    .from(wishlistItems)
    .where(
      and(eq(wishlistItems.wishlist_id, userWishlist.id), eq(wishlistItems.product_id, productId))
    );

  if (existing) {
    throw new HttpException(409, 'Product already in wishlist');
  }

  // Add to wishlist
  await db.insert(wishlistItems).values({
    wishlist_id: userWishlist.id,
    product_id: productId,
  });

  ResponseFormatter.created(
    res,
    {
      productId,
      message: 'Product added to wishlist',
    },
    'Product added to wishlist successfully'
  );
};

const router = Router();
router.post(
  '/:userId/wishlist/:productId',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  requireOwnerOrPermission('userId', 'users:write'),
  handler
);

export default router;
