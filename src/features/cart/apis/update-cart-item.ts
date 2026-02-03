/**
 * PUT /api/cart/items/:id
 * Update quantity of a cart item
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, sql, SQL, isNull } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../shared/carts.schema';
import { cartItems } from '../shared/cart-items.schema';
import { products } from '../../product/shared/products.schema';
import { productVariants } from '../../product/shared/product-variants.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';
import { releaseCartStock, reserveCartStock } from '../../inventory/services/inventory.service';
import { CART_RESERVATION_CONFIG } from '../config/cart-reservation.config';

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
            variant_id: cartItems.variant_id,
            cost_price: cartItems.cost_price,
            final_price: cartItems.final_price,
            quantity: cartItems.quantity,
            reservation_id: cartItems.reservation_id,
            reservation_expires_at: cartItems.reservation_expires_at,
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

    // Get current product price for recalculation
    let currentPrice = Number(cartItem.final_price);
    let comparePrice = Number(cartItem.cost_price);

    if (cartItem.product_id) {
        // Fetch current product/variant price
        if (cartItem.variant_id) {
            const [variant] = await db
                .select({
                    selling_price: productVariants.selling_price,
                    compare_at_price: productVariants.compare_at_price,
                })
                .from(productVariants)
                .where(eq(productVariants.id, cartItem.variant_id))
                .limit(1);

            if (variant) {
                currentPrice = Number(variant.selling_price);
                comparePrice = variant.compare_at_price ? Number(variant.compare_at_price) : currentPrice;
            }
        } else {
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
    }

    const discountAmount = Math.max(comparePrice - currentPrice, 0);
    const lineSubtotal = comparePrice * quantity;
    const lineTotal = currentPrice * quantity;

    // Phase 2: Transactional Update & Reservation
    // We wrap Release -> Update -> Reserve in a transaction to prevent inventory leaks
    await db.transaction(async (tx) => {
        // [FIX] Lock rows to prevent race conditions.
        // 1. Lock cart item to serialize updates to this specific line
        await tx
            .select({ id: cartItems.id })
            .from(cartItems)
            .where(eq(cartItems.id, itemId))
            .for('update');

        // 2. Lock inventory row to serialize stock checks across all carts
        let totalStock = 0;
        if (cartItem.product_id) {
            let inventoryFilter: SQL = cartItem.variant_id
                ? eq(inventory.variant_id, cartItem.variant_id)
                : and(
                    eq(inventory.product_id, cartItem.product_id),
                    isNull(inventory.variant_id)
                )!;

            const [stockData] = await tx
                .select({
                    id: inventory.id,
                    totalStock: sql<number>`${inventory.available_quantity} - ${inventory.reserved_quantity}`
                })
                .from(inventory)
                .where(inventoryFilter)
                .for('update');

            totalStock = Number(stockData?.totalStock) || 0;
        }

        // 3. Validate stock availability (INSIDE transaction after locking)
        // currentReservedQty represents the quantity currently held by THIS cart item.
        // This quantity will be released and then re-reserved.
        const currentReservedQty = cartItem.quantity || 0;
        if (quantity > (totalStock + currentReservedQty)) {
            throw new HttpException(400, `Insufficient stock. Only ${totalStock + currentReservedQty} units available.`);
        }

        // 4. Release OLD reservation
        if (CART_RESERVATION_CONFIG.ENABLED && cartItem.product_id) {
            // We removed the try/catch block. If release fails, we must abort the transaction
            // to prevent inventory leaks (phantom reservations).
            await releaseCartStock(itemId, tx);
        }

        // 5. Update cart item with NEW quantity
        await tx.update(cartItems)
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

        // 6. Reserve NEW quantity
        if (CART_RESERVATION_CONFIG.ENABLED && cartItem.product_id) {
            // Note: reserveCartStock performs an internal validation.
            // We skip internal validation here because we already validated (considering user's held stock)
            // INSIDE THE TRANSACTION after acquiring locks.
            await reserveCartStock(
                cartItem.product_id,
                quantity,
                itemId,
                CART_RESERVATION_CONFIG.RESERVATION_TIMEOUT,
                tx,
                true, // skipValidation
                cartItem.variant_id // PASS VARIANT ID
            );
        }
    });

    // Recalculate cart totals (handling discounts)
    await cartService.recalculate(cart.id);

    // Fetch updated item
    const [updatedItem] = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, itemId));

    return ResponseFormatter.success(res, updatedItem, 'Cart item updated successfully');
};

import { optionalAuth } from '../../../middlewares';

const router = Router();
router.put('/items/:id', optionalAuth, handler);

export default router;
