/**
 * POST /api/cart/merge
 * Merge guest cart (session-based) into user cart when user logs in
 * 
 * - Requires authentication (user must be logged in)
 * - Accepts session_id in request body
 * - Finds guest cart by session_id
 * - Merges items into user's cart (combining quantities for same products)
 * - Marks guest cart as merged/archived
 * - Uses Redis locking to prevent duplicate merge attempts
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../shared/carts.schema';
import { cartItems } from '../shared/cart-items.schema';
import { products } from '../../product/shared/product.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';
import authMiddleware from '../../../middlewares/auth.middleware';
import { redisClient, isRedisReady } from '../../../utils';

// Validation schema
const mergeCartSchema = z.object({
    session_id: z.string().uuid('Invalid session ID format'),
});

// Lock key prefix for merge operations
const MERGE_LOCK_PREFIX = 'cart:merge:lock:';
const MERGE_LOCK_TTL = 30; // 30 seconds

/**
 * Try to acquire a lock for merge operation
 */
async function acquireMergeLock(userId: string, sessionId: string): Promise<boolean> {
    if (!isRedisReady()) {
        return true; // Allow operation if Redis is down
    }

    const lockKey = `${MERGE_LOCK_PREFIX}${userId}:${sessionId}`;
    try {
        // Set lock with NX (only if not exists) and EX (expiry)
        const result = await redisClient.set(lockKey, Date.now().toString(), {
            NX: true,
            EX: MERGE_LOCK_TTL,
        });
        return result === 'OK';
    } catch (error) {
        return true; // Allow operation if lock acquisition fails
    }
}

/**
 * Release the merge lock
 */
async function releaseMergeLock(userId: string, sessionId: string): Promise<void> {
    if (!isRedisReady()) return;

    const lockKey = `${MERGE_LOCK_PREFIX}${userId}:${sessionId}`;
    try {
        await redisClient.del(lockKey);
    } catch (error) {
        // Error releasing lock
    }
}

/**
 * Recalculate cart totals after merge
 */
async function recalculateCartTotals(cartId: string): Promise<void> {
    const items = await db
        .select({
            line_total: cartItems.line_total,
            line_subtotal: cartItems.line_subtotal,
            discount_amount: cartItems.discount_amount,
        })
        .from(cartItems)
        .where(and(
            eq(cartItems.cart_id, cartId),
            eq(cartItems.is_deleted, false)
        ));

    const subtotal = items.reduce((sum, item) => sum + Number(item.line_subtotal), 0);
    const discountTotal = items.reduce((sum, item) => sum + Number(item.discount_amount), 0);
    const grandTotal = items.reduce((sum, item) => sum + Number(item.line_total), 0);

    await db.update(carts)
        .set({
            subtotal: subtotal.toFixed(2),
            discount_total: discountTotal.toFixed(2),
            grand_total: grandTotal.toFixed(2),
            last_activity_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(carts.id, cartId));
}

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId;

    if (!userId) {
        throw new HttpException(401, 'Authentication required to merge carts');
    }

    // Parse and validate request body
    const { session_id: sessionId } = mergeCartSchema.parse(req.body);

    // Try to acquire lock to prevent duplicate merges
    const lockAcquired = await acquireMergeLock(userId, sessionId);
    if (!lockAcquired) {
        return ResponseFormatter.success(res, {
            merged: false,
            message: 'Merge already in progress',
            itemsMerged: 0,
        }, 'Merge in progress');
    }

    try {

        // Find guest cart by session_id
        const [guestCart] = await db
            .select()
            .from(carts)
            .where(and(
                eq(carts.session_id, sessionId),
                eq(carts.is_deleted, false) // Don't filter by status yet
            ))
            .limit(1);

        // Check if cart was already converted (idempotency)
        if (guestCart && guestCart.cart_status === 'converted') {
            // Return user's current cart
            const [userCart] = await db
                .select()
                .from(carts)
                .where(and(
                    eq(carts.user_id, userId),
                    eq(carts.cart_status, 'active'),
                    eq(carts.is_deleted, false)
                ))
                .limit(1);

            const userCartItems = userCart ? await db
                .select()
                .from(cartItems)
                .where(and(
                    eq(cartItems.cart_id, userCart.id),
                    eq(cartItems.is_deleted, false)
                )) : [];

            return ResponseFormatter.success(res, {
                merged: false,
                message: 'Guest cart already merged',
                cart_id: userCart?.id,
                itemCount: userCartItems.length,
            }, 'Cart already merged');
        }

        if (!guestCart || guestCart.cart_status !== 'active') {
            // No guest cart to merge - that's okay, just return user's cart
            const [userCart] = await db
                .select()
                .from(carts)
                .where(and(
                    eq(carts.user_id, userId),
                    eq(carts.cart_status, 'active'),
                    eq(carts.is_deleted, false)
                ))
                .limit(1);

            if (!userCart) {
                return ResponseFormatter.success(res, {
                    merged: false,
                    message: 'No guest cart found, no merge needed',
                    itemsMerged: 0,
                }, 'No cart to merge');
            }

            // Get user cart items
            const userCartItems = await db
                .select()
                .from(cartItems)
                .where(and(
                    eq(cartItems.cart_id, userCart.id),
                    eq(cartItems.is_deleted, false)
                ));

            return ResponseFormatter.success(res, {
                merged: false,
                message: 'No guest cart found',
                cart_id: userCart.id,
                itemCount: userCartItems.length,
            }, 'No guest cart to merge');
        }

        // Get guest cart items
        const guestItems = await db
            .select()
            .from(cartItems)
            .where(and(
                eq(cartItems.cart_id, guestCart.id),
                eq(cartItems.is_deleted, false)
            ));

        if (guestItems.length === 0) {
            // Guest cart is empty, mark it as merged and return
            await db.update(carts)
                .set({
                    cart_status: 'converted',
                    updated_at: new Date(),
                })
                .where(eq(carts.id, guestCart.id));

            return ResponseFormatter.success(res, {
                merged: true,
                message: 'Guest cart was empty',
                itemsMerged: 0,
            }, 'Empty guest cart merged');
        }

        // Find or create user cart
        let [userCart] = await db
            .select()
            .from(carts)
            .where(and(
                eq(carts.user_id, userId),
                eq(carts.cart_status, 'active'),
                eq(carts.is_deleted, false)
            ))
            .limit(1);

        if (!userCart) {
            // Create user cart
            const [newCart] = await db.insert(carts).values({
                user_id: userId,
                session_id: null,
                cart_status: 'active',
                source: 'web',
                created_by: userId,
            }).returning();
            userCart = newCart;
        }

        // Get existing user cart items
        const userItems = await db
            .select()
            .from(cartItems)
            .where(and(
                eq(cartItems.cart_id, userCart.id),
                eq(cartItems.is_deleted, false)
            ));

        // Create a map of user items by product_id for quick lookup
        const userItemsByProduct = new Map(
            userItems
                .filter(item => item.product_id)
                .map(item => [item.product_id!, item])
        );

        let itemsMerged = 0;

        // Merge each guest item into user cart
        for (const guestItem of guestItems) {
            if (!guestItem.product_id) continue; // Skip bundles for now

            const existingUserItem = userItemsByProduct.get(guestItem.product_id);

            if (existingUserItem) {
                // Item exists in user cart - combine quantities
                const newQuantity = existingUserItem.quantity + guestItem.quantity;

                // Check stock availability
                const [stockData] = await db
                    .select({
                        totalStock: sql<number>`SUM(${inventory.available_quantity} - ${inventory.reserved_quantity})`,
                    })
                    .from(inventory)
                    .where(eq(inventory.product_id, guestItem.product_id));

                const totalStock = Number(stockData?.totalStock) || 0;
                const finalQuantity = Math.min(newQuantity, totalStock);

                if (finalQuantity > 0) {
                    // Get product pricing info
                    const [product] = await db
                        .select({
                            selling_price: products.selling_price,
                            compare_at_price: products.compare_at_price,
                        })
                        .from(products)
                        .where(eq(products.id, guestItem.product_id))
                        .limit(1);

                    const sellingPrice = Number(product?.selling_price || guestItem.final_price);
                    const compareAtPrice = Number(product?.compare_at_price || guestItem.cost_price);
                    const discountAmount = Math.max(compareAtPrice - sellingPrice, 0);

                    await db.update(cartItems)
                        .set({
                            quantity: finalQuantity,
                            line_subtotal: (compareAtPrice * finalQuantity).toFixed(2),
                            line_total: (sellingPrice * finalQuantity).toFixed(2),
                            discount_amount: (discountAmount * finalQuantity).toFixed(2),
                            updated_at: new Date(),
                        })
                        .where(eq(cartItems.id, existingUserItem.id));

                    itemsMerged++;
                }
            } else {
                // Item doesn't exist in user cart - move it
                await db.update(cartItems)
                    .set({
                        cart_id: userCart.id,
                        updated_at: new Date(),
                    })
                    .where(eq(cartItems.id, guestItem.id));

                itemsMerged++;
            }
        }

        // Recalculate user cart totals
        await recalculateCartTotals(userCart.id);

        // Mark guest cart as merged
        await db.update(carts)
            .set({
                cart_status: 'converted',
                updated_at: new Date(),
            })
            .where(eq(carts.id, guestCart.id));

        // Get final cart state
        const finalItems = await db
            .select()
            .from(cartItems)
            .where(and(
                eq(cartItems.cart_id, userCart.id),
                eq(cartItems.is_deleted, false)
            ));

        return ResponseFormatter.success(res, {
            merged: true,
            message: `Successfully merged ${itemsMerged} items from guest cart`,
            cart_id: userCart.id,
            itemsMerged,
            totalItems: finalItems.length,
        }, 'Cart merged successfully');
    } finally {
        // Always release the lock
        await releaseMergeLock(userId, sessionId);
    }
};

const router = Router();
router.post('/merge', authMiddleware, handler);

export default router;
