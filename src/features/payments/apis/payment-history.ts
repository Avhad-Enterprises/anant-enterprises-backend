/**
 * GET /api/payments/transactions
 *
 * Retrieves all payment transactions for the authenticated user.
 * Supports pagination and status filtering.
 */

import { Router, Response } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
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

    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const status = req.query.status as string | undefined;
    const offset = (page - 1) * limit;

    // Build query conditions
    // Join with orders to filter by user
    const userOrdersSubquery = db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.user_id, userId));

    // Base condition - transactions for user's orders
    let whereClause = sql`${paymentTransactions.order_id} IN (${userOrdersSubquery})`;

    // Add status filter if provided
    if (status) {
        const validStatuses = [
            'initiated',
            'authorized',
            'captured',
            'failed',
            'refund_initiated',
            'refunded',
            'partially_refunded',
        ];
        if (validStatuses.includes(status)) {
            whereClause = sql`${whereClause} AND ${paymentTransactions.status} = ${status}`;
        }
    }

    // Count total
    const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(paymentTransactions)
        .where(whereClause);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Fetch transactions with order details
    const transactions = await db
        .select({
            id: paymentTransactions.id,
            order_id: paymentTransactions.order_id,
            order_number: orders.order_number,
            razorpay_order_id: paymentTransactions.razorpay_order_id,
            razorpay_payment_id: paymentTransactions.razorpay_payment_id,
            amount: paymentTransactions.amount,
            currency: paymentTransactions.currency,
            status: paymentTransactions.status,
            payment_method: paymentTransactions.payment_method,
            error_code: paymentTransactions.error_code,
            error_description: paymentTransactions.error_description,
            refund_id: paymentTransactions.refund_id,
            refund_amount: paymentTransactions.refund_amount,
            created_at: paymentTransactions.created_at,
            verified_at: paymentTransactions.verified_at,
        })
        .from(paymentTransactions)
        .innerJoin(orders, eq(paymentTransactions.order_id, orders.id))
        .where(whereClause)
        .orderBy(desc(paymentTransactions.created_at))
        .limit(limit)
        .offset(offset);

    // Format response
    const formattedTransactions = transactions.map(tx => ({
        id: tx.id,
        order_id: tx.order_id,
        order_number: tx.order_number,
        razorpay_payment_id: tx.razorpay_payment_id,
        amount: Number(tx.amount),
        currency: tx.currency,
        status: tx.status,
        payment_method: tx.payment_method,
        error_description: tx.error_description,
        refund_amount: tx.refund_amount ? Number(tx.refund_amount) : null,
        created_at: tx.created_at.toISOString(),
        verified_at: tx.verified_at?.toISOString(),
    }));

    return ResponseFormatter.success(res, {
        transactions: formattedTransactions,
        pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
        },
    }, 'Transactions retrieved');
};

// ============================================
// ROUTER
// ============================================

const router = Router();
router.get('/transactions', requireAuth, handler);

export default router;
