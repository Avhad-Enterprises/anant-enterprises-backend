/**
 * PUT /api/cart/items/:id
 * Update quantity of a cart item
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
import { releaseCartStock, reserveCartStock } from '../../inventory/services/inventory.service';
import { CART_RESERVATION_CONFIG } from '../../../config/cart-reservation.config';

// Validation schema
const updateCartItemSchema = z.object({
    quantity: z.number().int().min(1).max(100),
});

import { cartService } from '../services';

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || null;
    const sessionId = req.headers['x-session-id'] as string || null;
    const itemId = req.params.id as string;

    if (!userId && !sessionId) {
        throw new HttpException(401, 'Authentication or session ID required');
    }

    const { quantity } = updateCartItemSchema.parse(req.body);

    // Find the cart item
    const [cartItem] = await db
        .select({
            id: cartItems.id,
            cart_id: cartItems.cart_id,
            product_id: cartItems.product_id,
            cost_price: cartItems.cost_price,
            final_price: cartItems.final_price,
        })
        .from(cartItems)
        .where(and(
            eq(cartItems.id, itemId as string),
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

    // Check stock availability
    if (cartItem.product_id) {
        const [stockData] = await db
            .select({
                totalStock: sql<number>`SUM(${inventory.available_quantity} - ${inventory.reserved_quantity})`,
            })
            .from(inventory)
            .where(eq(inventory.product_id, cartItem.product_id));

        const availableStock = Number(stockData?.totalStock) || 0;
        if (quantity > availableStock) {
            throw new HttpException(400, `Only ${availableStock} units available`);
        }
    }

    // Get current product price for recalculation
    let currentPrice = Number(cartItem.final_price);
    let comparePrice = Number(cartItem.cost_price);

    if (cartItem.product_id) {
        const [product] = await db
            .select({
                selling_price: products.selling_price,
                compare_at_price: products.compare_at_price,
            })
            .from(products)
            .where(eq(products.id, cartItem.product_id))
            .limit(1);

        if (product) {
            currentPrice = Number(product.selling_price);
            comparePrice = product.compare_at_price ? Number(product.compare_at_price) : currentPrice;
        }
    }

    const discountAmount = Math.max(comparePrice - currentPrice, 0);
    const lineSubtotal = comparePrice * quantity;
    const lineTotal = currentPrice * quantity;

    // Update cart item
    await db.update(cartItems)
        .set({
            quantity,
            final_price: currentPrice.toFixed(2),
            cost_price: comparePrice.toFixed(2),
            discount_amount: (discountAmount * quantity).toFixed(2),
            line_subtotal: lineSubtotal.toFixed(2),
            line_total: lineTotal.toFixed(2),
            updated_at: new Date(),
        })
        .where(eq(cartItems.id, itemId));

    // Phase 2: Update reservation with new quantity
    if (CART_RESERVATION_CONFIG.ENABLED && cartItem.product_id) {
        try {
            await releaseCartStock(itemId);
            await reserveCartStock(
                cartItem.product_id,
                quantity,
                itemId,
                CART_RESERVATION_CONFIG.RESERVATION_TIMEOUT
            );
            console.log('[update-cart-item] Updated cart reservation:', {
                item_id: itemId,
                new_quantity: quantity,
            });
        } catch (error: any) {
            console.warn('[update-cart-item] Failed to update reservation:', error.message);
            // Continue - cart still works without reservation
        }
    }

    // Recalculate cart totals (handling discounts)
    await cartService.recalculate(cart.id);

    // Fetch updated item
    const [updatedItem] = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, itemId));

    return ResponseFormatter.success(res, updatedItem, 'Cart item updated successfully');
};

import { optionalAuth } from '../../../middlewares/auth.middleware';

const router = Router();
router.put('/items/:id', optionalAuth, handler);

export default router;
