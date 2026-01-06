/**
 * POST /api/payments/verify
 *
 * Verifies payment signature after successful Razorpay checkout.
 * This is called by the frontend after the user completes payment.
 *
 * IMPORTANT: This endpoint performs client-side verification.
 * The definitive payment confirmation comes via webhooks.
 * Always check order status before fulfillment.
 *
 * Flow:
 * 1. Validate request parameters
 * 2. Verify signature using HMAC SHA256
 * 3. Update payment transaction status
 * 4. Update order payment status
 * 5. Return success with order details
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../../orders/shared/orders.schema';
import { paymentTransactions } from '../shared/payment-transactions.schema';
import { RazorpayService } from '../services/razorpay.service';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

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
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Parse and validate request body
    const body = verifyPaymentSchema.parse(req.body);

    // Find the payment transaction
    const transaction = await db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.razorpay_order_id, body.razorpay_order_id),
    });

    if (!transaction) {
        logger.warn('Payment verification failed - transaction not found', {
            razorpayOrderId: body.razorpay_order_id,
            userId,
        });
        throw new HttpException(404, 'Payment not found', {
            code: 'PAYMENT_NOT_FOUND',
        });
    }

    // Verify the order belongs to the user
    const [order] = await db
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.id, transaction.order_id),
                eq(orders.user_id, userId),
                eq(orders.is_deleted, false)
            )
        )
        .limit(1);

    if (!order) {
        logger.warn('Payment verification failed - order not found or unauthorized', {
            razorpayOrderId: body.razorpay_order_id,
            userId,
            transactionOrderId: transaction.order_id,
        });
        throw new HttpException(404, 'Order not found');
    }

    // Check if already verified
    if (transaction.status === 'captured') {
        logger.info('Payment already verified', {
            orderId: order.id,
            razorpayPaymentId: body.razorpay_payment_id,
        });

        return ResponseFormatter.success(
            res,
            {
                order_id: order.id,
                order_number: order.order_number,
                payment_status: 'paid',
                transaction_id: transaction.razorpay_payment_id,
                paid_at: transaction.verified_at?.toISOString() || new Date().toISOString(),
                amount_paid: Number(order.total_amount),
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
        logger.error('Payment signature verification failed', {
            orderId: order.id,
            razorpayOrderId: body.razorpay_order_id,
            razorpayPaymentId: body.razorpay_payment_id,
        });

        // Update transaction as failed
        await db
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
        await db
            .update(orders)
            .set({
                last_payment_error: 'Payment signature verification failed',
                updated_at: new Date(),
            })
            .where(eq(orders.id, order.id));

        throw new HttpException(400, 'Payment verification failed', {
            code: 'INVALID_SIGNATURE',
            recoverable: false,
            details: 'The payment signature is invalid. Please contact support.',
        });
    }

    // Signature is valid - update transaction
    const now = new Date();
    await db
        .update(paymentTransactions)
        .set({
            status: 'captured',
            razorpay_payment_id: body.razorpay_payment_id,
            razorpay_signature: body.razorpay_signature,
            verified_at: now,
            updated_at: now,
        })
        .where(eq(paymentTransactions.id, transaction.id));

    // Update order
    await db
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
        .where(eq(orders.id, order.id));

    logger.info('Payment verified successfully', {
        orderId: order.id,
        orderNumber: order.order_number,
        razorpayOrderId: body.razorpay_order_id,
        razorpayPaymentId: body.razorpay_payment_id,
        amount: order.total_amount,
    });

    return ResponseFormatter.success(
        res,
        {
            order_id: order.id,
            order_number: order.order_number,
            payment_status: 'paid',
            transaction_id: body.razorpay_payment_id,
            paid_at: now.toISOString(),
            amount_paid: Number(order.total_amount),
        },
        'Payment verified successfully'
    );
};

// ============================================
// ROUTER
// ============================================

const router = Router();
router.post('/verify', requireAuth, handler);

export default router;
