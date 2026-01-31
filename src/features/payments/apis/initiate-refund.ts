/**
 * POST /api/payments/refund
 *
 * Initiates a full or partial refund for a paid order.
 * Admin only - requires orders.refund permission.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../../orders/shared/orders.schema';
import { paymentTransactions } from '../shared/payment-transactions.schema';
import { RazorpayService } from '../services/razorpay.service';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

// ============================================
// REQUEST VALIDATION
// ============================================

const initiateRefundSchema = z.object({
    order_id: z.string().uuid('Invalid order ID'),
    amount: z.number().positive().optional(), // Partial refund amount (full if omitted)
    reason: z.string().min(5, 'Reason must be at least 5 characters').max(200),
    refund_speed: z.enum(['normal', 'optimum']).optional().default('normal'),
});

// ============================================
// HANDLER
// ============================================

const handler = async (req: RequestWithUser, res: Response) => {
    const adminId = req.userId;
    if (!adminId) {
        throw new HttpException(401, 'Authentication required');
    }

    const body = initiateRefundSchema.parse(req.body);

    // Fetch order
    const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, body.order_id))
        .limit(1);

    if (!order) {
        throw new HttpException(404, 'Order not found');
    }

    // Verify order is paid
    if (order.payment_status !== 'paid' && order.payment_status !== 'partially_refunded') {
        throw new HttpException(400, 'Order is not paid, cannot refund', {
            code: 'REFUND_NOT_ALLOWED',
            details: `Order payment status is "${order.payment_status}". Only paid orders can be refunded.`,
        });
    }

    // Check for Razorpay payment
    if (!order.transaction_id) {
        throw new HttpException(400, 'No payment transaction found for this order', {
            code: 'REFUND_NOT_ALLOWED',
        });
    }

    // Get successful payment transaction
    const transaction = await db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.razorpay_payment_id, order.transaction_id),
    });

    if (!transaction) {
        throw new HttpException(400, 'Payment transaction not found', {
            code: 'REFUND_NOT_ALLOWED',
        });
    }

    // Calculate refundable amount
    const paidAmount = Number(order.total_amount);
    const previousRefunds = Number(transaction.refund_amount || 0);
    const refundableAmount = paidAmount - previousRefunds;

    // Determine refund amount
    const refundAmount = body.amount || refundableAmount;

    // Validate refund amount
    if (refundAmount > refundableAmount) {
        throw new HttpException(400, 'Refund amount exceeds refundable balance', {
            code: 'REFUND_AMOUNT_EXCEEDED',
            details: `Requested refund: ₹${refundAmount.toFixed(2)}, Available: ₹${refundableAmount.toFixed(2)}`,
        });
    }

    // Convert to paise
    const refundAmountPaise = Math.round(refundAmount * 100);

    // Call Razorpay refund API
    const refund = await RazorpayService.createRefund(order.transaction_id, {
        amount: refundAmountPaise,
        speed: body.refund_speed,
        notes: {
            order_id: order.id,
            order_number: order.order_number,
            reason: body.reason,
            initiated_by: adminId,
        },
    });

    // Determine new payment status
    const totalRefunded = previousRefunds + refundAmount;
    const isFullRefund = totalRefunded >= paidAmount;
    const newPaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';
    const newOrderStatus = isFullRefund ? 'refunded' : order.order_status;

    // Update payment transaction
    await db
        .update(paymentTransactions)
        .set({
            status: isFullRefund ? 'refunded' : 'partially_refunded',
            refund_id: refund.id,
            refund_amount: totalRefunded.toFixed(2),
            refund_reason: body.reason,
            refunded_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(paymentTransactions.id, transaction.id));

    // Update order
    await db
        .update(orders)
        .set({
            payment_status: newPaymentStatus,
            order_status: newOrderStatus,
            updated_at: new Date(),
            updated_by: adminId,
        })
        .where(eq(orders.id, order.id));

    logger.info('Refund initiated', {
        orderId: order.id,
        orderNumber: order.order_number,
        refundId: refund.id,
        amount: refundAmount,
        status: refund.status,
        initiatedBy: adminId,
    });

    return ResponseFormatter.success(
        res,
        {
            refund_id: refund.id,
            payment_id: order.transaction_id,
            amount: refundAmount,
            currency: order.currency,
            status: refund.status,
            speed_requested: refund.speed_requested,
            speed_processed: refund.speed_processed,
            is_full_refund: isFullRefund,
            remaining_refundable: refundableAmount - refundAmount,
            created_at: new Date().toISOString(),
        },
        `Refund of ₹${refundAmount.toFixed(2)} initiated successfully`
    );
};

// ============================================
// ROUTER
// ============================================

const router = Router();
router.post('/refund', requireAuth, requirePermission('orders.refund'), handler);

export default router;
