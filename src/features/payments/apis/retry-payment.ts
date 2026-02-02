/**
 * POST /api/payments/retry
 *
 * Creates a new payment order for a failed payment.
 * Limits retries to prevent abuse.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../../orders/shared/orders.schema';
import { users } from '../../user/shared/user.schema';
import { carts } from '../../cart/shared/carts.schema';
import { cartItems } from '../../cart/shared/cart-items.schema';
import { paymentTransactions } from '../shared/payment-transactions.schema';
import { RazorpayService } from '../services/razorpay.service';
import { PaymentLockService } from '../services/payment-lock.service';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

// ============================================
// CONSTANTS
// ============================================

const MAX_PAYMENT_ATTEMPTS = 5;

// ============================================
// REQUEST VALIDATION
// ============================================

const retryPaymentSchema = z.object({
    order_id: z.string().uuid('Invalid order ID'),
});

// ============================================
// HANDLER
// ============================================

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const body = retryPaymentSchema.parse(req.body);

    // Use distributed lock
    const result = await PaymentLockService.withLock(body.order_id, async () => {
        // Fetch order
        const [order] = await db
            .select()
            .from(orders)
            .where(
                and(
                    eq(orders.id, body.order_id),
                    eq(orders.user_id, userId),
                    eq(orders.is_deleted, false)
                )
            )
            .limit(1);

        if (!order) {
            throw new HttpException(404, 'Order not found');
        }

        // Check if already paid
        if (order.payment_status === 'paid') {
            throw new HttpException(400, 'Order is already paid', {
                code: 'ORDER_ALREADY_PAID',
            });
        }

        // Check retry limit
        if (order.payment_attempts >= MAX_PAYMENT_ATTEMPTS) {
            logger.warn('Max payment attempts exceeded', {
                orderId: order.id,
                attempts: order.payment_attempts,
            });
            throw new HttpException(400, 'Maximum payment attempts exceeded', {
                code: 'MAX_RETRIES_EXCEEDED',
                details: `You have exceeded the maximum number of payment attempts (${MAX_PAYMENT_ATTEMPTS}). Please contact support.`,
            });
        }

        // Check order age (don't allow retry for very old orders)
        const orderAge = Date.now() - order.created_at.getTime();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (orderAge > maxAge) {
            throw new HttpException(400, 'Order has expired', {
                code: 'ORDER_EXPIRED',
                details: 'This order is too old to retry payment. Please create a new order.',
            });
        }

        // SECURITY: Validate order amount against current cart state before retry
        // This prevents price manipulation if user modified cart after order creation
        if (order.cart_id) {
            const [currentCart] = await db
                .select()
                .from(carts)
                .where(eq(carts.id, order.cart_id))
                .limit(1);

            if (currentCart && currentCart.cart_status === 'active') {
                const currentCartItems = await db
                    .select()
                    .from(cartItems)
                    .where(and(
                        eq(cartItems.cart_id, order.cart_id),
                        eq(cartItems.is_deleted, false)
                    ));

                const currentSubtotal = currentCartItems.reduce(
                    (sum, item) => sum + (Number(item.final_price) * item.quantity),
                    0
                );
                const currentDiscountTotal = Number(currentCart.discount_total) || 0;
                const currentGrandTotal = Math.max(currentSubtotal - currentDiscountTotal, 0);

                const orderTotal = Number(order.total_amount);
                const tolerance = 0.01;

                if (Math.abs(currentGrandTotal - orderTotal) > tolerance) {
                    logger.warn('Cart modified - cannot retry payment with stale order', {
                        orderId: order.id,
                        orderTotal,
                        currentCartTotal: currentGrandTotal,
                    });

                    throw new HttpException(400, 
                        'Cart has been modified. Please create a new order.', 
                        'CART_MODIFIED'
                    );
                }
            }
        }

        // Mark any existing initiated transactions as failed
        await db
            .update(paymentTransactions)
            .set({
                status: 'failed',
                error_description: 'Superseded by retry attempt',
                updated_at: new Date(),
            })
            .where(
                and(
                    eq(paymentTransactions.order_id, body.order_id),
                    eq(paymentTransactions.status, 'initiated')
                )
            );

        // Create new Razorpay order
        const amountInPaise = Math.round(Number(order.total_amount) * 100);

        const razorpayOrder = await RazorpayService.createOrder({
            amount: amountInPaise,
            currency: order.currency,
            receipt: order.id,
            notes: {
                order_id: order.id,
                order_number: order.order_number,
                user_id: userId,
                retry: 'true',
            },
        });

        // Create new payment transaction
        await db.insert(paymentTransactions).values({
            order_id: order.id,
            razorpay_order_id: razorpayOrder.id,
            amount: order.total_amount,
            currency: order.currency,
            status: 'initiated',
            idempotency_key: `retry_${order.id}_${Date.now()}`,
        });

        // Update order
        const newAttempts = (order.payment_attempts || 0) + 1;
        await db
            .update(orders)
            .set({
                razorpay_order_id: razorpayOrder.id,
                payment_attempts: newAttempts,
                last_payment_error: null,
                updated_at: new Date(),
            })
            .where(eq(orders.id, order.id));

        logger.info('Payment retry initiated', {
            orderId: order.id,
            orderNumber: order.order_number,
            razorpayOrderId: razorpayOrder.id,
            attempt: newAttempts,
        });

        // Fetch user for prefill
        const [user] = await db
            .select({ name: users.first_name, email: users.email, phone: users.phone_number })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        return {
            razorpay_order_id: razorpayOrder.id,
            razorpay_key_id: RazorpayService.getKeyId(),
            amount: amountInPaise,
            currency: order.currency,
            order_id: order.id,
            order_number: order.order_number,
            attempt: newAttempts,
            max_attempts: MAX_PAYMENT_ATTEMPTS,
            prefill: {
                name: user?.name || undefined,
                email: user?.email || undefined,
                contact: user?.phone || undefined,
            },
            notes: {
                order_id: order.id,
                order_number: order.order_number,
            },
            theme: {
                color: '#0066FF',
            },
        };
    });

    return ResponseFormatter.success(res, result, 'Payment retry initiated', 201);
};

// ============================================
// ROUTER
// ============================================

const router = Router();
router.post('/retry', requireAuth, handler);

export default router;
