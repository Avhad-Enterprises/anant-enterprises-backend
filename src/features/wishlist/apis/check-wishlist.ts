/**
 * GET /api/wishlist/check/:productId
 * Check if a product is in the user's wishlist
 * - Used for UI toggle state
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
        return ResponseFormatter.success(res, {
            product_id: productId,
            in_wishlist: false,
        }, 'Product is not in wishlist');
    }

    // Check if product is in wishlist
    const [item] = await db
        .select({
            product_id: wishlistItems.product_id,
            added_at: wishlistItems.added_at,
        })
        .from(wishlistItems)
        .where(and(
            eq(wishlistItems.wishlist_id, wishlist.id),
            eq(wishlistItems.product_id, productId)
        ))
        .limit(1);

    return ResponseFormatter.success(res, {
        product_id: productId,
        in_wishlist: !!item,
        added_at: item?.added_at || null,
    }, item ? 'Product is in wishlist' : 'Product is not in wishlist');
};

const router = Router();
router.get('/check/:productId', requireAuth, handler);

export default router;
