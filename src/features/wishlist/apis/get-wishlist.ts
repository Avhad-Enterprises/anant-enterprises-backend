/**
 * GET /api/wishlist
 * Get current user's wishlist with all products
 * - Requires authentication
 * - Includes product details, stock status, and prices
 */

import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { wishlists } from '../shared/wishlist.schema';
import { wishlistItems } from '../shared/wishlist-items.schema';
import { products } from '../../product/shared/products.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { z } from 'zod';
import { IWishlistItemResponse, IWishlistResponse } from '../shared/interface';
import { getProductRatingSubquery, getProductReviewCountSubquery, getProductStockSubquery } from '../shared/queries';

const handler = async (req: RequestWithUser, res: Response) => {
    // Support admin/owner access
    // We prioritize param (admin mode), fallback to auth user (self mode)
    const targetUserIdRaw = req.params.userId || req.userId;
    const targetUserId = Array.isArray(targetUserIdRaw) ? targetUserIdRaw[0] : targetUserIdRaw;

    if (!targetUserId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Find user's wishlist
    const [wishlist] = await db
        .select()
        .from(wishlists)
        .where(and(
            eq(wishlists.user_id, targetUserId),
            eq(wishlists.status, true)
        ))
        .limit(1);

    if (!wishlist) {
        return ResponseFormatter.success(res, {
            id: null,
            access_token: null,
            items: [],
            itemCount: 0,
        } as IWishlistResponse, 'No wishlist found');
    }

    // Get wishlist items with product data and optimized stats subqueries
    const items = await db
        .select({
            product_id: wishlistItems.product_id,
            notes: wishlistItems.notes,
            added_at: wishlistItems.added_at,
            added_to_cart_at: wishlistItems.added_to_cart_at,
            purchased_at: wishlistItems.purchased_at,
            // Product data
            product_name: products.product_title,
            product_image: products.primary_image_url,
            selling_price: products.selling_price,
            compare_at_price: products.compare_at_price,
            sku: products.sku,
            product_status: products.status,
            // Optimized: Get stock in same query using subquery
            totalStock: getProductStockSubquery(),
            // Optimized: Get rating stats
            avg_rating: getProductRatingSubquery(),
            review_count: getProductReviewCountSubquery(),
        })
        .from(wishlistItems)
        .innerJoin(products, eq(wishlistItems.product_id, products.id))
        .where(eq(wishlistItems.wishlist_id, wishlist.id));

    // Enrich items with stats
    const enrichedItems: IWishlistItemResponse[] = items.map((item) => {
        const availableStock = Number(item.totalStock) || 0;

        return {
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.product_image,
            selling_price: item.selling_price,
            compare_at_price: item.compare_at_price,
            sku: item.sku,
            inStock: availableStock > 0 && item.product_status === 'active',
            availableStock,
            notes: item.notes,
            added_at: item.added_at,
            added_to_cart_at: item.added_to_cart_at,
            purchased_at: item.purchased_at,
            rating: Number(item.avg_rating) || 0,
            reviews: Number(item.review_count) || 0,
        };
    });

    const response: IWishlistResponse = {
        id: wishlist.id,
        access_token: wishlist.access_token,
        items: enrichedItems,
        itemCount: enrichedItems.length,
    };

    return ResponseFormatter.success(res, response, 'Wishlist retrieved successfully');
};

const router = Router();

// Admin route only - get any user's wishlist
router.get(
    '/:userId/wishlist',
    requireAuth,
    validationMiddleware(z.object({ userId: z.string().uuid() }), 'params'),
    requireOwnerOrPermission('userId', 'users:read'),
    handler
);

export default router;
