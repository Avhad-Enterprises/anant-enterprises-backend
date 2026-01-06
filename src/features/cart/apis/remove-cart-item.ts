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

/**
 * Recalculate cart totals
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
    const userId = userReq.userId || null;
    const sessionId = req.headers['x-session-id'] as string || null;
    const itemId = req.params.id;

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

    // Soft delete the cart item
    await db.update(cartItems)
        .set({
            is_deleted: true,
            deleted_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(cartItems.id, itemId));

    // Recalculate cart totals
    await recalculateCartTotals(cart.id);

    return ResponseFormatter.success(res, null, `"${cartItem.product_name || 'Item'}" removed from cart`);
};

const router = Router();
router.delete('/items/:id', handler);

export default router;
