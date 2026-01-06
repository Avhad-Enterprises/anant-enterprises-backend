/**
 * POST /api/payments/create-order
 *
 * Creates a Razorpay order for an existing pending order.
 * This endpoint is called before opening the Razorpay checkout.
 *
 * Flow:
 * 1. Validate order exists and is in pending state
 * 2. Check order not already paid
 * 3. Acquire distributed lock to prevent duplicate creation
 * 4. Create Razorpay order via service
 * 5. Insert payment_transaction record
 * 6. Update order with razorpay_order_id
 * 7. Return Razorpay order details for frontend checkout
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../../orders/shared/orders.schema';
import { users } from '../../user/shared/user.schema';
import { paymentTransactions } from '../shared/payment-transactions.schema';
import { RazorpayService } from '../services/razorpay.service';
import { PaymentLockService } from '../services/payment-lock.service';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

// ============================================
// REQUEST VALIDATION
// ============================================

const createPaymentOrderSchema = z.object({
    order_id: z.string().uuid('Invalid order ID'),
    payment_method: z.enum(['razorpay', 'cod']).default('razorpay'),
    save_payment_method: z.boolean().optional().default(false),
});

// ============================================
// HANDLER
// ============================================

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Parse and validate request body
    const body = createPaymentOrderSchema.parse(req.body);

    // Handle COD separately
    if (body.payment_method === 'cod') {
        return handleCodPayment(req, res, body.order_id, userId);
    }

    // Use distributed lock to prevent duplicate Razorpay order creation
    const result = await PaymentLockService.withLock(body.order_id, async () => {
        // Fetch order with validation
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
            throw new HttpException(404, 'Order not found', {
                code: 'ORDER_NOT_FOUND',
            });
        }

        // Check if order is already paid
        if (order.payment_status === 'paid') {
            throw new HttpException(400, 'Order is already paid', {
                code: 'ORDER_ALREADY_PAID',
                details: `Order ${order.order_number} has already been paid.`,
            });
        }

        // Check if order is cancelled
        if (order.order_status === 'cancelled') {
            throw new HttpException(400, 'Cannot process payment for cancelled order', {
                code: 'ORDER_CANCELLED',
            });
        }

        // Check for existing pending Razorpay order (reuse if not expired)
        const existingTransaction = await db.query.paymentTransactions.findFirst({
            where: and(
                eq(paymentTransactions.order_id, body.order_id),
                eq(paymentTransactions.status, 'initiated')
            ),
        });

        if (existingTransaction) {
            // Check if the existing Razorpay order is still valid (less than 25 mins old)
            const createdAt = new Date(existingTransaction.created_at);
            const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;

            if (ageMinutes < 25) {
                logger.info('Reusing existing Razorpay order', {
                    orderId: body.order_id,
                    razorpayOrderId: existingTransaction.razorpay_order_id,
                    ageMinutes,
                });

                // Fetch user info for prefill
                const [user] = await db
                    .select({ name: users.full_name, email: users.email, phone: users.phone })
                    .from(users)
                    .where(eq(users.id, userId))
                    .limit(1);

                return buildPaymentResponse(order, existingTransaction.razorpay_order_id, user);
            }

            // Mark expired transaction as failed
            await db
                .update(paymentTransactions)
                .set({
                    status: 'failed',
                    error_description: 'Payment order expired',
                    updated_at: new Date(),
                })
                .where(eq(paymentTransactions.id, existingTransaction.id));
        }

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
            },
        });

        // Create payment transaction record
        await db.insert(paymentTransactions).values({
            order_id: order.id,
            razorpay_order_id: razorpayOrder.id,
            amount: order.total_amount,
            currency: order.currency,
            status: 'initiated',
            idempotency_key: `create_${order.id}_${Date.now()}`,
        });

        // Update order with Razorpay order ID
        await db
            .update(orders)
            .set({
                razorpay_order_id: razorpayOrder.id,
                payment_method: 'razorpay',
                payment_attempts: (order.payment_attempts || 0) + 1,
                updated_at: new Date(),
            })
            .where(eq(orders.id, order.id));

        logger.info('Razorpay order created', {
            orderId: order.id,
            orderNumber: order.order_number,
            razorpayOrderId: razorpayOrder.id,
            amount: amountInPaise,
        });

        // Fetch user info for prefill
        const [user] = await db
            .select({ name: users.full_name, email: users.email, phone: users.phone })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        return buildPaymentResponse(order, razorpayOrder.id, user);
    });

    return ResponseFormatter.success(res, result, 'Payment order created successfully', 201);
};

// ============================================
// HELPERS
// ============================================

/**
 * Build the response object for frontend Razorpay checkout
 */
function buildPaymentResponse(
    order: typeof orders.$inferSelect,
    razorpayOrderId: string,
    user?: { name: string | null; email: string | null; phone: string | null }
) {
    const amountInPaise = Math.round(Number(order.total_amount) * 100);

    return {
        razorpay_order_id: razorpayOrderId,
        razorpay_key_id: RazorpayService.getKeyId(),
        amount: amountInPaise,
        currency: order.currency,
        order_id: order.id,
        order_number: order.order_number,
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
            color: '#0066FF', // Brand color
        },
    };
}

/**
 * Handle Cash on Delivery payment
 */
async function handleCodPayment(
    req: RequestWithUser,
    res: Response,
    orderId: string,
    userId: string
) {
    const [order] = await db
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.id, orderId),
                eq(orders.user_id, userId),
                eq(orders.is_deleted, false)
            )
        )
        .limit(1);

    if (!order) {
        throw new HttpException(404, 'Order not found');
    }

    if (order.payment_status === 'paid') {
        throw new HttpException(400, 'Order is already paid');
    }

    // Update order for COD
    await db
        .update(orders)
        .set({
            payment_method: 'cod',
            payment_status: 'pending', // COD is pending until delivery
            order_status: 'confirmed',
            cod_due_amount: order.total_amount,
            updated_at: new Date(),
        })
        .where(eq(orders.id, orderId));

    logger.info('COD order confirmed', {
        orderId,
        orderNumber: order.order_number,
        amount: order.total_amount,
    });

    return ResponseFormatter.success(
        res,
        {
            order_id: order.id,
            order_number: order.order_number,
            payment_method: 'cod',
            payment_status: 'pending',
            order_status: 'confirmed',
            total_amount: Number(order.total_amount),
        },
        'Order confirmed for Cash on Delivery',
        201
    );
}

// ============================================
// ROUTER
// ============================================

const router = Router();
router.post('/create-order', requireAuth, handler);

export default router;
