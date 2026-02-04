/**
 * POST /admin/orders/verify-payment
 *
 * Admin endpoint to verify payment signature after Razorpay checkout.
 * Unlike the user endpoint, this doesn't validate user ownership.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { carts } from '../../cart/shared/carts.schema';
import { paymentTransactions } from '../../payments/shared/payment-transactions.schema';
import { RazorpayService } from '../../payments/services/razorpay.service';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares/permission.middleware';

// ============================================
// REQUEST VALIDATION
// ============================================

const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string().min(1, 'Razorpay order ID is required'),
    razorpay_payment_id: z.string().min(1, 'Razorpay payment ID is required'),
    razorpay_signature: z.string().min(1, 'Signature is required'),
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
    const body = verifyPaymentSchema.parse(req.body);

    // Find the payment transaction
    const transaction = await db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.razorpay_order_id, body.razorpay_order_id),
    });

    if (!transaction) {
        logger.warn('[Admin] Payment verification failed - transaction not found', {
            razorpayOrderId: body.razorpay_order_id,
            adminId,
        });
        throw new HttpException(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    }

    // Find the order (no user validation for admin)
    const [order] = await db
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.id, transaction.order_id),
                eq(orders.is_deleted, false)
            )
        )
        .limit(1);

    if (!order) {
        logger.warn('[Admin] Payment verification failed - order not found', {
            razorpayOrderId: body.razorpay_order_id,
            adminId,
            transactionOrderId: transaction.order_id,
        });
        throw new HttpException(404, 'Order not found');
    }

    // Check if already verified (captured status means webhook already confirmed)
    if (transaction.status === 'captured' || transaction.webhook_verified) {
        logger.info('[Admin] Payment already captured via webhook', {
            orderId: order.id,
            razorpayPaymentId: body.razorpay_payment_id,
            adminId,
        });

        return ResponseFormatter.success(
            res,
            {
                order_id: order.id,
                order_number: order.order_number,
                payment_status: order.payment_status,
                transaction_id: transaction.razorpay_payment_id,
                paid_at: transaction.verified_at?.toISOString() || order.paid_at?.toISOString() || null,
                amount_paid: Number(order.total_amount),
                confirmation_source: 'webhook',
            },
            'Payment already verified'
        );
    }

    // Verify signature
    const isValid = RazorpayService.verifyPaymentSignature(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature
    );

    if (!isValid) {
        logger.error('[Admin] Payment signature verification failed', {
            orderId: order.id,
            razorpayOrderId: body.razorpay_order_id,
            razorpayPaymentId: body.razorpay_payment_id,
            adminId,
        });

        // Use transaction for atomic update
        await db.transaction(async (tx) => {
            // Update transaction as failed
            await tx
                .update(paymentTransactions)
                .set({
                    status: 'failed',
                    error_code: 'INVALID_SIGNATURE',
                    error_description: 'Payment signature verification failed',
                    razorpay_payment_id: body.razorpay_payment_id,
                    updated_at: new Date(),
                })
                .where(eq(paymentTransactions.id, transaction.id));

            // Update order with error
            await tx
                .update(orders)
                .set({
                    last_payment_error: 'Payment signature verification failed',
                    updated_at: new Date(),
                })
                .where(eq(orders.id, order.id));
        });

        throw new HttpException(400, 'Payment verification failed', 'INVALID_SIGNATURE');
    }

    // Verify payment amount from Razorpay matches our expected amount
    try {
        const razorpayPayment = await RazorpayService.getPayment(body.razorpay_payment_id);
        const paidAmountPaise = Number(razorpayPayment.amount);
        const expectedAmountPaise = Math.round(Number(order.total_amount) * 100);

        if (paidAmountPaise !== expectedAmountPaise) {
            logger.error('[Admin] SECURITY ALERT: Payment amount mismatch!', {
                orderId: order.id,
                orderNumber: order.order_number,
                razorpayPaymentId: body.razorpay_payment_id,
                expectedAmountPaise,
                paidAmountPaise,
                difference: paidAmountPaise - expectedAmountPaise,
                adminId,
            });

            throw new HttpException(400, 'Payment amount mismatch', 'AMOUNT_MISMATCH');
        }
    } catch (error: any) {
        if (error.status === 400) throw error; // Re-throw amount mismatch error

        // Log but don't fail verification on Razorpay API errors
        logger.warn('[Admin] Could not verify payment amount from Razorpay API', {
            razorpayPaymentId: body.razorpay_payment_id,
            error: error.message,
            adminId,
        });
    }

    // Signature is valid - update in a transaction
    const now = new Date();

    await db.transaction(async (tx) => {
        // Update transaction status to 'captured'
        await tx
            .update(paymentTransactions)
            .set({
                status: 'captured',
                razorpay_payment_id: body.razorpay_payment_id,
                razorpay_signature: body.razorpay_signature,
                verified_at: now,
                updated_at: now,
            })
            .where(
                and(
                    eq(paymentTransactions.id, transaction.id),
                    // Only update if still in expected state (idempotency guard)
                    inArray(paymentTransactions.status, ['initiated', 'failed'])
                )
            );

        // Update order to 'paid' status
        await tx
            .update(orders)
            .set({
                payment_status: 'paid',
                order_status: 'confirmed',
                transaction_id: body.razorpay_payment_id,
                payment_ref: body.razorpay_order_id,
                paid_at: now,
                last_payment_error: null,
                updated_at: now,
            })
            .where(
                and(
                    eq(orders.id, order.id),
                    // Only update if still in expected state
                    inArray(orders.payment_status, ['pending', 'failed'])
                )
            );

        // Mark cart as converted (if applicable)
        if (order.cart_id) {
            await tx.update(carts)
                .set({
                    cart_status: 'converted',
                    updated_at: now,
                })
                .where(eq(carts.id, order.cart_id));
        }
    });

    logger.info('[Admin] Payment verified and captured', {
        orderId: order.id,
        orderNumber: order.order_number,
        razorpayOrderId: body.razorpay_order_id,
        razorpayPaymentId: body.razorpay_payment_id,
        amount: order.total_amount,
        adminId,
    });

    // Return 'paid' status
    return ResponseFormatter.success(
        res,
        {
            order_id: order.id,
            order_number: order.order_number,
            payment_status: 'paid',
            transaction_id: body.razorpay_payment_id,
            paid_at: now.toISOString(),
            amount_paid: Number(order.total_amount),
            confirmation_source: 'admin',
        },
        'Payment verified successfully'
    );
};

// ============================================
// ROUTER
// ============================================

const router = Router();
router.post('/admin/orders/verify-payment', requireAuth, requirePermission('orders:verify_payment'), handler);

export default router;
