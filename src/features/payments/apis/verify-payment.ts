/**
 * POST /api/payments/verify
 *
 * Verifies payment signature after successful Razorpay checkout.
 * This is called by the frontend after the user completes payment.
 *
 * IMPORTANT: This endpoint marks the payment as 'paid' immediately after verification.
 * The webhook handler provides additional confirmation but this is the primary update.
 *
 * Flow:
 * 1. Validate request parameters
 * 2. Verify signature using HMAC SHA256
 * 3. Update payment transaction status to 'captured' (in transaction)
 * 4. Update order payment status to 'paid' (in transaction)
 * 5. Return success with order details
 * 6. Webhook will later confirm (source of truth)
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../../orders/shared/orders.schema';
import { carts } from '../../cart/shared/carts.schema';
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
        throw new HttpException(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
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

    // Check if already verified (captured status means webhook already confirmed)
    if (transaction.status === 'captured' || transaction.webhook_verified) {
        logger.info('Payment already captured via webhook', {
            orderId: order.id,
            razorpayPaymentId: body.razorpay_payment_id,
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
        logger.error('Payment signature verification failed', {
            orderId: order.id,
            razorpayOrderId: body.razorpay_order_id,
            razorpayPaymentId: body.razorpay_payment_id,
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

    // SECURITY: Verify payment amount from Razorpay matches our expected amount
    // Fetch the actual payment from Razorpay to verify amount
    try {
        const razorpayPayment = await RazorpayService.getPayment(body.razorpay_payment_id);
        const paidAmountPaise = Number(razorpayPayment.amount);
        const expectedAmountPaise = Math.round(Number(order.total_amount) * 100);

        if (paidAmountPaise !== expectedAmountPaise) {
            logger.error('SECURITY ALERT: Payment amount mismatch in verification!', {
                orderId: order.id,
                orderNumber: order.order_number,
                razorpayPaymentId: body.razorpay_payment_id,
                expectedAmountPaise,
                paidAmountPaise,
                difference: paidAmountPaise - expectedAmountPaise,
            });

            throw new HttpException(400, 'Payment amount mismatch', 'AMOUNT_MISMATCH');
        }
    } catch (error: any) {
        if (error.status === 400) throw error; // Re-throw amount mismatch error
        
        // Log but don't fail verification on Razorpay API errors
        // The signature is valid, so payment is legitimate
        logger.warn('Could not verify payment amount from Razorpay API', {
            razorpayPaymentId: body.razorpay_payment_id,
            error: error.message,
        });
    }

    // Signature is valid - update in a transaction
    // TRADITIONAL FLOW: Mark as CAPTURED/PAID immediately upon valid signature.
    // Webhook will serve as a redundant confirmation.
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

        // Mark cart as converted (since we skipped this in create-order for online payments)
        if (order.cart_id) {
            await tx.update(carts)
                .set({
                    cart_status: 'converted',
                    updated_at: now,
                })
                .where(eq(carts.id, order.cart_id));
        }
    });

    // Record discount usage if applicable (Fire and Forget - but log failures)
    if (order.discount_code && order.discount_id) {
        // Run asynchronously to not block the response
        (async () => {
            try {
                // Import dynamically to avoid circular dependencies
                const { discountCodeService } = await import('../../discount/services');

                await discountCodeService.recordUsage({
                    discount_id: order.discount_id!,
                    discount_code: order.discount_code!,
                    user_id: userId,
                    order_id: order.id,
                    order_number: order.order_number,
                    discount_type: order.discount_type || 'unknown',
                    discount_amount: Number(order.discount_amount),
                    order_subtotal: Number(order.subtotal),
                    order_total: Number(order.total_amount),
                    items_count: order.total_quantity
                });

                logger.info('Discount usage recorded', {
                    code: order.discount_code,
                    orderId: order.id
                });
            } catch (error) {
                logger.error('Failed to record discount usage', {
                    orderId: order.id,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        })();
    }

    logger.info('Payment verified and captured', {
        orderId: order.id,
        orderNumber: order.order_number,
        razorpayOrderId: body.razorpay_order_id,
        razorpayPaymentId: body.razorpay_payment_id,
        amount: order.total_amount,
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
            confirmation_source: 'client',
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
