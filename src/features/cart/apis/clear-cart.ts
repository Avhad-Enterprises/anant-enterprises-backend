/**
 * DELETE /api/cart
 * Clear all items from the cart
 */

import { Router, Response, Request } from 'express';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../shared/carts.schema';
import { cartItems } from '../shared/cart-items.schema';
import { RequestWithUser } from '../../../interfaces';

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || null;
    const sessionId = req.headers['x-session-id'] as string || null;

    if (!userId && !sessionId) {
        throw new HttpException(401, 'Authentication or session ID required');
    }

    // Find active cart
    let cart;
    if (userId) {
        [cart] = await db
            .select({ id: carts.id })
            .from(carts)
            .where(and(
                eq(carts.user_id, userId),
                eq(carts.cart_status, 'active'),
                eq(carts.is_deleted, false)
            ))
            .limit(1);
    } else if (sessionId) {
        [cart] = await db
            .select({ id: carts.id })
            .from(carts)
            .where(and(
                eq(carts.session_id, sessionId),
                eq(carts.cart_status, 'active'),
                eq(carts.is_deleted, false)
            ))
            .limit(1);
    }

    if (!cart) {
        return ResponseFormatter.success(res, null, 'Cart is already empty');
    }

    // Soft delete all cart items
    await db.update(cartItems)
        .set({
            is_deleted: true,
            deleted_at: new Date(),
            updated_at: new Date(),
        })
        .where(and(
            eq(cartItems.cart_id, cart.id),
            eq(cartItems.is_deleted, false)
        ));

    // Reset cart totals
    await db.update(carts)
        .set({
            subtotal: '0.00',
            discount_total: '0.00',
            grand_total: '0.00',
            applied_discount_codes: [],
            applied_giftcard_codes: [],
            last_activity_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(carts.id, cart.id));

    return ResponseFormatter.success(res, null, 'Cart cleared successfully');
};

import { optionalAuth } from '../../../middlewares/auth.middleware';

const router = Router();
router.delete('/', optionalAuth, handler);

export default router;
