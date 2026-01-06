/**
 * DELETE /api/users/:userId/wishlist/:productId
 * Remove product from wishlist
 * - Users can remove from their own wishlist
 * - Users with users:delete permission can remove from any user's wishlist
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

const paramsSchema = z.object({
  userId: uuidSchema,
  productId: uuidSchema,
});

const handler = async (req: RequestWithUser, res: Response) => {
  const { userId, productId } = req.params;

  // Get user's wishlist
  const [userWishlist] = await db
    .select()
    .from(wishlists)
    .where(eq(wishlists.user_id, userId))
    .limit(1);

  if (!userWishlist) {
    throw new HttpException(404, 'Wishlist not found');
  }

  // Check if item exists in wishlist
  const [existing] = await db
    .select()
    .from(wishlistItems)
    .where(
      and(eq(wishlistItems.wishlist_id, userWishlist.id), eq(wishlistItems.product_id, productId))
    );

  if (!existing) {
    throw new HttpException(404, 'Product not found in wishlist');
  }

  // Remove from wishlist
  await db
    .delete(wishlistItems)
    .where(
      and(eq(wishlistItems.wishlist_id, userWishlist.id), eq(wishlistItems.product_id, productId))
    );

  ResponseFormatter.success(res, null, 'Product removed from wishlist successfully');
};

const router = Router();
router.delete(
  '/:userId/wishlist/:productId',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  requireOwnerOrPermission('userId', 'users:delete'),
  handler
);

export default router;
