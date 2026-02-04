/**
 * POST /admin/orders/create-payment-order
 *
 * Admin endpoint to create a Razorpay payment order for any order.
 * Unlike the user endpoint, this doesn't validate user ownership.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { users } from '../../user/shared/user.schema';
import { paymentTransactions } from '../../payments/shared/payment-transactions.schema';
import { RazorpayService } from '../../payments/services/razorpay.service';
import { PaymentLockService } from '../../payments/services/payment-lock.service';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares/permission.middleware';

// ============================================
// REQUEST VALIDATION
// ============================================

const createPaymentOrderSchema = z.object({
    orderId: z.string().uuid('Invalid order ID'),
    paymentMethod: z.enum(['razorpay', 'cod']).default('razorpay'),
});

// ============================================
// HANDLER
// ============================================

const handler = async (req: RequestWithUser, res: Response) => {
    const adminId = req.userId;
    if (!adminId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Parse and validate request body
    const body = createPaymentOrderSchema.parse(req.body);

    // Use distributed lock to prevent duplicate Razorpay order creation
    const result = await PaymentLockService.withLock(body.orderId, async () => {
        // Fetch order (admin can access any order)
        const [order] = await db
            .select()
            .from(orders)
            .where(
                and(
                    eq(orders.id, body.orderId),
                    eq(orders.is_deleted, false)
                )
            )
            .limit(1);

        if (!order) {
            throw new HttpException(404, 'Order not found', 'ORDER_NOT_FOUND');
        }

        // Check if order is already paid
        if (order.payment_status === 'paid') {
            throw new HttpException(400, `Order ${order.order_number} is already paid`, 'ORDER_ALREADY_PAID');
        }

        // Check if order is cancelled
        if (order.order_status === 'cancelled') {
            throw new HttpException(400, 'Cannot process payment for cancelled order', 'ORDER_CANCELLED');
        }

        // Check for existing pending Razorpay order (reuse if not expired)
        const existingTransaction = await db.query.paymentTransactions.findFirst({
            where: and(
                eq(paymentTransactions.order_id, body.orderId),
                eq(paymentTransactions.status, 'initiated')
            ),
        });

        if (existingTransaction) {
            // Check if the existing Razorpay order is still valid (less than 25 mins old)
            const createdAt = new Date(existingTransaction.created_at);
            const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;

            if (ageMinutes < 25) {
                logger.info('[Admin] Reusing existing Razorpay order', {
                    orderId: body.orderId,
                    razorpayOrderId: existingTransaction.razorpay_order_id,
                    ageMinutes,
                    adminId,
                });

                // Fetch user info for prefill
                const user = order.user_id ? await db.query.users.findFirst({
                    where: eq(users.id, order.user_id),
                    columns: {
                        first_name: true,
                        email: true,
                        phone_number: true
                    }
                }) : null;

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
                admin_created: 'true',
                admin_id: adminId,
            },
        });

        // Create payment transaction record
        await db.insert(paymentTransactions).values({
            order_id: order.id,
            razorpay_order_id: razorpayOrder.id,
            amount: order.total_amount,
            currency: order.currency,
            status: 'initiated',
            idempotency_key: `admin_create_${order.id}_${Date.now()}`,
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

        logger.info('[Admin] Razorpay order created', {
            orderId: order.id,
            orderNumber: order.order_number,
            razorpayOrderId: razorpayOrder.id,
            amount: amountInPaise,
            adminId,
        });

        // Fetch user info for prefill
        const user = order.user_id ? await db.query.users.findFirst({
            where: eq(users.id, order.user_id),
            columns: {
                first_name: true,
                email: true,
                phone_number: true
            }
        }) : null;

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
    user?: { first_name: string | null; email: string | null; phone_number: string | null } | null
) {
    const amountInPaise = Math.round(Number(order.total_amount) * 100);
    const razorpayKeyId = RazorpayService.getKeyId();

    logger.info('[Admin] Building payment response', {
        razorpayKeyId: razorpayKeyId ? `${razorpayKeyId.substring(0, 12)}...` : 'MISSING',
        razorpayOrderId,
        amount: amountInPaise,
    });

    return {
        razorpay_order_id: razorpayOrderId,
        razorpay_key_id: razorpayKeyId,
        amount: amountInPaise,
        currency: order.currency,
        order_id: order.id,
        order_number: order.order_number,
        prefill: {
            name: user?.first_name || undefined,
            email: user?.email || undefined,
            contact: user?.phone_number || undefined,
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

// ============================================
// ROUTER
// ============================================

const router = Router();
router.post('/admin/orders/create-payment-order', requireAuth, requirePermission('orders:create_payment'), handler);

export default router;
