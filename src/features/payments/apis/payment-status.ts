/**
 * GET /api/payments/:orderId/status
 *
 * Retrieves current payment status for an order.
 * Includes all payment transaction history.
 */

import { Router, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../../orders/shared/orders.schema';
import { paymentTransactions } from '../shared/payment-transactions.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

// ============================================
// HANDLER
// ============================================

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const { orderId } = req.params;

    if (!orderId) {
        throw new HttpException(400, 'Order ID is required');
    }

    // Fetch order
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

    // Fetch payment transactions
    const transactions = await db
        .select({
            id: paymentTransactions.id,
            razorpay_payment_id: paymentTransactions.razorpay_payment_id,
            amount: paymentTransactions.amount,
            status: paymentTransactions.status,
            payment_method: paymentTransactions.payment_method,
            error_code: paymentTransactions.error_code,
            error_description: paymentTransactions.error_description,
            created_at: paymentTransactions.created_at,
        })
        .from(paymentTransactions)
        .where(eq(paymentTransactions.order_id, orderId))
        .orderBy(desc(paymentTransactions.created_at));

    // Format transactions for response
    const formattedTransactions = transactions.map(tx => ({
        id: tx.id,
        razorpay_payment_id: tx.razorpay_payment_id,
        amount: Number(tx.amount),
        status: tx.status,
        payment_method: tx.payment_method,
        error_description: tx.error_description,
        created_at: tx.created_at.toISOString(),
    }));

    return ResponseFormatter.success(res, {
        order_id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        order_status: order.order_status,
        total_amount: Number(order.total_amount),
        currency: order.currency,
        payment_method: order.payment_method,
        razorpay_order_id: order.razorpay_order_id,
        payment_attempts: order.payment_attempts,
        last_payment_error: order.last_payment_error,
        paid_at: order.paid_at?.toISOString(),
        transactions: formattedTransactions,
    }, 'Payment status retrieved');
};

// ============================================
// ROUTER
// ============================================

const router = Router();
router.get('/:orderId/status', requireAuth, handler);

export default router;
