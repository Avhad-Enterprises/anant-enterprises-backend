/**
 * DELETE /api/cart/items/:id
 * Remove an item from the cart
 */

import { Router, Response, Request } from 'express';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../shared/carts.schema';
import { cartItems } from '../shared/cart-items.schema';
import { RequestWithUser } from '../../../interfaces';
import { releaseCartStock } from '../../inventory/services/inventory.service';
import { CART_RESERVATION_CONFIG } from '../../../config/cart-reservation.config';

import { cartService } from '../services';

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || null;
    const sessionId = req.headers['x-session-id'] as string || null;
    const itemId = req.params.id as string;

    if (!userId && !sessionId) {
        throw new HttpException(401, 'Authentication or session ID required');
    }

    // Find the cart item
    const [cartItem] = await db
        .select({
            id: cartItems.id,
            cart_id: cartItems.cart_id,
            product_name: cartItems.product_name,
        })
        .from(cartItems)
        .where(and(
            eq(cartItems.id, itemId),
            eq(cartItems.is_deleted, false)
        ))
        .limit(1);

    if (!cartItem) {
        throw new HttpException(404, 'Cart item not found');
    }

    // Verify cart ownership
    const [cart] = await db
        .select({ id: carts.id, user_id: carts.user_id, session_id: carts.session_id })
        .from(carts)
        .where(eq(carts.id, cartItem.cart_id))
        .limit(1);

    if (!cart) {
        throw new HttpException(404, 'Cart not found');
    }

    // Check ownership
    if (userId && cart.user_id !== userId) {
        throw new HttpException(403, 'Not authorized to modify this cart');
    }
    if (!userId && sessionId && cart.session_id !== sessionId) {
        throw new HttpException(403, 'Not authorized to modify this cart');
    }

    // Phase 2: Release stock reservation before deletion
    if (CART_RESERVATION_CONFIG.ENABLED) {
        try {
            await releaseCartStock(itemId);
        } catch (error: any) {
            // Fail entire operation if reservation release fails
            console.error('[remove-cart-item] Failed to release stock reservation:', error);
            throw new HttpException(500, 'Failed to release stock reservation. Please try again.');
        }
    }

    // Soft delete the cart item
    await db.update(cartItems)
        .set({
            is_deleted: true,
            deleted_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(cartItems.id, itemId));

    // Recalculate cart totals (handling discounts)
    await cartService.recalculate(cart.id);

    return ResponseFormatter.success(res, null, `"${cartItem.product_name || 'Item'}" removed from cart`);
};

import { optionalAuth } from '../../../middlewares/auth.middleware';

const router = Router();
router.delete('/items/:id', optionalAuth, handler);

export default router;
