/**
 * GET /api/wishlist
 * Get current user's wishlist with all products
 * - Requires authentication
 * - Includes product details, stock status, and prices
 */

import { Router, Response } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { wishlists } from '../shared/wishlist.schema';
import { wishlistItems } from '../shared/wishlist-items.schema';
import { products } from '../../product/shared/product.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

interface WishlistItemResponse {
    product_id: string;
    product_name: string;
    product_image: string | null;
    selling_price: string;
    compare_at_price: string | null;
    sku: string;
    inStock: boolean;
    availableStock: number;
    notes: string | null;
    added_at: Date;
    added_to_cart_at: Date | null;
    purchased_at: Date | null;
}

interface WishlistResponse {
    id: string | null;
    access_token: string | null;
    items: WishlistItemResponse[];
    itemCount: number;
}

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Find user's wishlist
    const [wishlist] = await db
        .select()
        .from(wishlists)
        .where(and(
            eq(wishlists.user_id, userId),
            eq(wishlists.status, true)
        ))
        .limit(1);

    if (!wishlist) {
        return ResponseFormatter.success(res, {
            id: null,
            access_token: null,
            items: [],
            itemCount: 0,
        } as WishlistResponse, 'No wishlist found');
    }

    // Get wishlist items with product data
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
        })
        .from(wishlistItems)
        .innerJoin(products, eq(wishlistItems.product_id, products.id))
        .where(eq(wishlistItems.wishlist_id, wishlist.id));

    // Enrich items with stock information
    const enrichedItems: WishlistItemResponse[] = await Promise.all(
        items.map(async (item) => {
            // Get stock for this product
            const [stockData] = await db
                .select({
                    totalStock: sql<number>`SUM(${inventory.available_quantity} - ${inventory.reserved_quantity})`,
                })
                .from(inventory)
                .where(eq(inventory.product_id, item.product_id));

            const availableStock = Number(stockData?.totalStock) || 0;

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
            };
        })
    );

    const response: WishlistResponse = {
        id: wishlist.id,
        access_token: wishlist.access_token,
        items: enrichedItems,
        itemCount: enrichedItems.length,
    };

    return ResponseFormatter.success(res, response, 'Wishlist retrieved successfully');
};

const router = Router();
router.get('/', requireAuth, handler);

export default router;
