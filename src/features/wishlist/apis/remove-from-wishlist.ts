/**
 * DELETE /api/wishlist/items/:productId
 * Remove a product from the wishlist
 */

import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { wishlists } from '../shared/wishlist.schema';
import { wishlistItems } from '../shared/wishlist-items.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    const productId = req.params.productId as string;

    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Find user's wishlist
    const [wishlist] = await db
        .select({ id: wishlists.id })
        .from(wishlists)
        .where(and(
            eq(wishlists.user_id, userId),
            eq(wishlists.status, true)
        ))
        .limit(1);

    if (!wishlist) {
        throw new HttpException(404, 'Wishlist not found');
    }

    // Check if item exists in wishlist
    const [existingItem] = await db
        .select({ product_id: wishlistItems.product_id })
        .from(wishlistItems)
        .where(and(
            eq(wishlistItems.wishlist_id, wishlist.id),
            eq(wishlistItems.product_id, productId)
        ))
        .limit(1);

    if (!existingItem) {
        throw new HttpException(404, 'Product not found in wishlist');
    }

    // Delete the item (hard delete since it's a junction table)
    await db.delete(wishlistItems)
        .where(and(
            eq(wishlistItems.wishlist_id, wishlist.id),
            eq(wishlistItems.product_id, productId)
        ));

    // Update wishlist timestamp
    await db.update(wishlists)
        .set({ updated_at: new Date() })
        .where(eq(wishlists.id, wishlist.id));

    return ResponseFormatter.success(res, null, 'Product removed from wishlist');
};

const router = Router();
router.delete('/items/:productId', requireAuth, handler);

export default router;
