/**
 * POST /api/users/:userId/wishlist/:productId/move-to-cart
 * Move product from wishlist to cart
 * - Users can move items from their own wishlist
 * - Users with users:write permission can move items for any user
 * - Option B: Keeps item in wishlist and updates added_to_cart_at timestamp
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { wishlists } from '../../wishlist/shared/wishlist.schema';
import { wishlistItems } from '../../wishlist/shared/wishlist-items.schema';
import { products } from '../../product/shared/product.schema';
import { carts } from '../../cart/shared/carts.schema';
import { cartItems } from '../../cart/shared/cart-items.schema';

const paramsSchema = z.object({
    userId: z.string().uuid('User ID must be a valid UUID'),
    productId: z.string().uuid('Product ID must be a valid UUID'),
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

    // Check if product is in wishlist
    const [wishlistItem] = await db
        .select()
        .from(wishlistItems)
        .where(
            and(
                eq(wishlistItems.wishlist_id, userWishlist.id),
                eq(wishlistItems.product_id, productId)
            )
        );

    if (!wishlistItem) {
        throw new HttpException(404, 'Product not found in wishlist');
    }

    // Get product details
    const [product] = await db
        .select()
        .from(products)
        .where(
            and(
                eq(products.id, productId),
                eq(products.is_deleted, false)
            )
        );

    if (!product) {
        throw new HttpException(404, 'Product not found');
    }

    // Get or create user's cart
    let [userCart] = await db
        .select()
        .from(carts)
        .where(
            and(
                eq(carts.user_id, userId),
                eq(carts.cart_status, 'active'),
                eq(carts.is_deleted, false)
            )
        )
        .limit(1);

    if (!userCart) {
        // Create cart for user
        [userCart] = await db
            .insert(carts)
            .values({
                user_id: userId,
                cart_status: 'active',
                currency: 'INR',
            })
            .returning();
    }

    // Check if product already in cart
    const [existingCartItem] = await db
        .select()
        .from(cartItems)
        .where(
            and(
                eq(cartItems.cart_id, userCart.id),
                eq(cartItems.product_id, productId),
                eq(cartItems.is_deleted, false)
            )
        );

    if (existingCartItem) {
        // Update quantity if already in cart
        await db
            .update(cartItems)
            .set({
                quantity: existingCartItem.quantity + 1,
                updated_at: new Date(),
            })
            .where(eq(cartItems.id, existingCartItem.id));
    } else {
        // Add to cart
        await db.insert(cartItems).values({
            cart_id: userCart.id,
            product_id: productId,
            quantity: 1,
            cost_price: product.cost_price,
            final_price: product.selling_price,
            line_subtotal: product.selling_price,
            line_total: product.selling_price,
            product_name: product.product_title,
            product_image_url: product.primary_image_url,
            product_sku: product.sku,
        });
    }

    // Option B: Update added_to_cart_at timestamp (keep in wishlist)
    await db
        .update(wishlistItems)
        .set({
            added_to_cart_at: new Date(),
        })
        .where(
            and(
                eq(wishlistItems.wishlist_id, userWishlist.id),
                eq(wishlistItems.product_id, productId)
            )
        );

    // Update cart last activity
    await db
        .update(carts)
        .set({
            last_activity_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(carts.id, userCart.id));

    ResponseFormatter.success(
        res,
        {
            cartId: userCart.id,
            productId,
            message: 'Product moved to cart',
        },
        'Product moved to cart successfully'
    );
};

const router = Router();
router.post(
    '/:userId/wishlist/:productId/move-to-cart',
    requireAuth,
    validationMiddleware(paramsSchema, 'params'),
    requireOwnerOrPermission('userId', 'users:write'),
    handler
);

export default router;
