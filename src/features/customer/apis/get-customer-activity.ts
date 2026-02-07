/**
 * GET /api/users/customer/:id/activity
 * Get comprehensive activity timeline for a customer
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter, uuidSchema, logger } from '../../../utils';
import { db } from '../../../database';
import { sql } from 'drizzle-orm';

const paramsSchema = z.object({
  id: uuidSchema,
});

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  category: z
    .enum(['all', 'order', 'payment', 'account', 'cart', 'wishlist'])
    .optional()
    .default('all'),
});

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: string | null;
  timestamp: string;
  category: string;
  raw_timestamp: Date;
}

async function getCustomerActivity(
  userId: string,
  limit: number,
  offset: number,
  category: string
): Promise<{ activities: ActivityItem[]; total: number }> {
  // Build the comprehensive activity query using raw SQL
  const activityQuery = sql`
        WITH customer_activities AS (
            -- Account Created
            SELECT 
                u.id::text as id,
                'account_created' as activity_type,
                'Account Created' as title,
                CONCAT('Registered with email ', u.email) as description,
                NULL as amount,
                u.created_at as activity_timestamp,
                'account' as category
            FROM users u
            WHERE u.id = ${userId}
            
            UNION ALL
            
            -- Email Verified
            SELECT 
                CONCAT(u.id::text, '-email') as id,
                'email_verified' as activity_type,
                'Email Verified' as title,
                CONCAT('Email ', u.email, ' verified successfully') as description,
                NULL as amount,
                u.email_verified_at as activity_timestamp,
                'account' as category
            FROM users u
            WHERE u.id = ${userId} AND u.email_verified = true AND u.email_verified_at IS NOT NULL
            
            UNION ALL
            
            -- Phone Verified
            SELECT 
                CONCAT(u.id::text, '-phone') as id,
                'phone_verified' as activity_type,
                'Phone Verified' as title,
                CONCAT('Phone ', u.phone_number, ' verified successfully') as description,
                NULL as amount,
                u.phone_verified_at as activity_timestamp,
                'account' as category
            FROM users u
            WHERE u.id = ${userId} AND u.phone_verified = true AND u.phone_verified_at IS NOT NULL
            
            UNION ALL
            
            -- Order Created
            SELECT 
                o.id::text as id,
                'order_created' as activity_type,
                'Order Placed' as title,
                CONCAT('Order #', o.order_number, ' placed via ', o.channel) as description,
                CONCAT('₹', o.total_amount) as amount,
                o.created_at as activity_timestamp,
                'order' as category
            FROM orders o
            WHERE o.user_id = ${userId} AND o.is_deleted = false
            
            UNION ALL
            
            -- Order Paid
            SELECT 
                CONCAT(o.id::text, '-paid') as id,
                'order_paid' as activity_type,
                'Payment Completed' as title,
                CONCAT('Payment completed for order #', o.order_number) as description,
                CONCAT('₹', o.total_amount) as amount,
                o.paid_at as activity_timestamp,
                'payment' as category
            FROM orders o
            WHERE o.user_id = ${userId} AND o.paid_at IS NOT NULL AND o.is_deleted = false
            
            UNION ALL
            
            -- Order Fulfilled
            SELECT 
                CONCAT(o.id::text, '-fulfilled') as id,
                'order_fulfilled' as activity_type,
                'Order Fulfilled' as title,
                CONCAT('Order #', o.order_number, ' items fulfilled') as description,
                NULL as amount,
                o.fulfillment_date as activity_timestamp,
                'order' as category
            FROM orders o
            WHERE o.user_id = ${userId} AND o.fulfillment_date IS NOT NULL AND o.is_deleted = false
            
            UNION ALL
            
            -- Order Delivered
            SELECT 
                CONCAT(o.id::text, '-delivered') as id,
                'order_delivered' as activity_type,
                'Order Delivered' as title,
                CONCAT('Order #', o.order_number, ' was delivered') as description,
                CONCAT('₹', o.total_amount) as amount,
                o.delivery_date as activity_timestamp,
                'order' as category
            FROM orders o
            WHERE o.user_id = ${userId} AND o.delivery_date IS NOT NULL AND o.is_deleted = false
            
            UNION ALL
            
            -- Order Returned
            SELECT 
                CONCAT(o.id::text, '-returned') as id,
                'order_returned' as activity_type,
                'Order Returned' as title,
                CONCAT('Order #', o.order_number, ' was returned') as description,
                CONCAT('₹', o.return_amount) as amount,
                o.return_date as activity_timestamp,
                'order' as category
            FROM orders o
            WHERE o.user_id = ${userId} AND o.return_date IS NOT NULL AND o.is_deleted = false
            
            UNION ALL
            
            -- Payment Transactions - Captured
            SELECT 
                pt.id::text as id,
                'payment_captured' as activity_type,
                'Payment Successful' as title,
                CONCAT('Transaction via ', COALESCE(pt.payment_method, 'Online')) as description,
                CONCAT('₹', pt.amount) as amount,
                COALESCE(pt.verified_at, pt.created_at) as activity_timestamp,
                'payment' as category
            FROM payment_transactions pt
            JOIN orders o ON pt.order_id = o.id
            WHERE o.user_id = ${userId} AND pt.status = 'captured'
            
            UNION ALL
            
            -- Payment Transactions - Failed
            SELECT 
                pt.id::text as id,
                'payment_failed' as activity_type,
                'Payment Failed' as title,
                CONCAT('Failed: ', COALESCE(pt.error_description, 'Unknown error')) as description,
                CONCAT('₹', pt.amount) as amount,
                pt.created_at as activity_timestamp,
                'payment' as category
            FROM payment_transactions pt
            JOIN orders o ON pt.order_id = o.id
            WHERE o.user_id = ${userId} AND pt.status = 'failed'
            
            UNION ALL
            
            -- Payment Transactions - Refunded
            SELECT 
                CONCAT(pt.id::text, '-refund') as id,
                'payment_refunded' as activity_type,
                'Payment Refunded' as title,
                CONCAT('Refund processed for ₹', pt.refund_amount) as description,
                CONCAT('₹', pt.refund_amount) as amount,
                pt.refunded_at as activity_timestamp,
                'payment' as category
            FROM payment_transactions pt
            JOIN orders o ON pt.order_id = o.id
            WHERE o.user_id = ${userId} AND pt.refunded_at IS NOT NULL
            
            UNION ALL
            
            -- Cart Abandoned
            SELECT 
                c.id::text as id,
                'cart_abandoned' as activity_type,
                'Cart Abandoned' as title,
                CONCAT('Cart with ₹', c.grand_total, ' worth of items was abandoned') as description,
                CONCAT('₹', c.grand_total) as amount,
                c.abandoned_at as activity_timestamp,
                'cart' as category
            FROM carts c
            WHERE c.user_id = ${userId} AND c.abandoned_at IS NOT NULL AND c.is_deleted = false
            
            UNION ALL
            
            -- Wishlist Items Purchased
            SELECT 
                CONCAT(w.id::text, '-', wi.product_id::text) as id,
                'wishlist_purchased' as activity_type,
                'Wishlist Item Purchased' as title,
                'Purchased item from wishlist' as description,
                NULL as amount,
                wi.purchased_at as activity_timestamp,
                'wishlist' as category
            FROM wishlist_items wi
            JOIN wishlists w ON wi.wishlist_id = w.id
            WHERE w.user_id = ${userId} AND wi.purchased_at IS NOT NULL
            
            UNION ALL
            
            -- Reviews Submitted
            SELECT 
                r.id::text as id,
                'review_submitted' as activity_type,
                'Review Submitted' as title,
                CONCAT('Rated a product ', r.rating, ' stars') as description,
                NULL as amount,
                r.created_at as activity_timestamp,
                'account' as category
            FROM reviews r
            WHERE r.user_id = ${userId} AND r.is_deleted = false
            
            UNION ALL
            
            -- Address Added
            SELECT 
                ua.id::text as id,
                'address_added' as activity_type,
                'New Address Added' as title,
                CONCAT(ua.address_type, ' address in ', ua.city, ', ', ua.state_province) as description,
                NULL as amount,
                ua.created_at as activity_timestamp,
                'account' as category
            FROM user_addresses ua
            WHERE ua.user_id = ${userId} AND ua.is_deleted = false
        )
        SELECT 
            id,
            activity_type,
            title,
            description,
            amount,
            activity_timestamp,
            category,
            TO_CHAR(activity_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM') as formatted_time
        FROM customer_activities
        WHERE activity_timestamp IS NOT NULL
        ${category !== 'all' ? sql`AND category = ${category}` : sql``}
        ORDER BY activity_timestamp DESC
        LIMIT ${limit}
        OFFSET ${offset}
    `;

  const countQuery = sql`
        WITH customer_activities AS (
            SELECT u.created_at as activity_timestamp, 'account' as category
            FROM users u WHERE u.id = ${userId}
            UNION ALL
            SELECT u.email_verified_at, 'account' FROM users u WHERE u.id = ${userId} AND u.email_verified = true AND u.email_verified_at IS NOT NULL
            UNION ALL
            SELECT u.phone_verified_at, 'account' FROM users u WHERE u.id = ${userId} AND u.phone_verified = true AND u.phone_verified_at IS NOT NULL
            UNION ALL
            SELECT o.created_at, 'order' FROM orders o WHERE o.user_id = ${userId} AND o.is_deleted = false
            UNION ALL
            SELECT o.paid_at, 'payment' FROM orders o WHERE o.user_id = ${userId} AND o.paid_at IS NOT NULL AND o.is_deleted = false
            UNION ALL
            SELECT o.fulfillment_date, 'order' FROM orders o WHERE o.user_id = ${userId} AND o.fulfillment_date IS NOT NULL AND o.is_deleted = false
            UNION ALL
            SELECT o.delivery_date, 'order' FROM orders o WHERE o.user_id = ${userId} AND o.delivery_date IS NOT NULL AND o.is_deleted = false
            UNION ALL
            SELECT o.return_date, 'order' FROM orders o WHERE o.user_id = ${userId} AND o.return_date IS NOT NULL AND o.is_deleted = false
            UNION ALL
            SELECT COALESCE(pt.verified_at, pt.created_at), 'payment' FROM payment_transactions pt JOIN orders o ON pt.order_id = o.id WHERE o.user_id = ${userId} AND pt.status = 'captured'
            UNION ALL
            SELECT pt.created_at, 'payment' FROM payment_transactions pt JOIN orders o ON pt.order_id = o.id WHERE o.user_id = ${userId} AND pt.status = 'failed'
            UNION ALL
            SELECT pt.refunded_at, 'payment' FROM payment_transactions pt JOIN orders o ON pt.order_id = o.id WHERE o.user_id = ${userId} AND pt.refunded_at IS NOT NULL
            UNION ALL
            SELECT c.abandoned_at, 'cart' FROM carts c WHERE c.user_id = ${userId} AND c.abandoned_at IS NOT NULL AND c.is_deleted = false
            UNION ALL
            SELECT wi.purchased_at, 'wishlist' FROM wishlist_items wi JOIN wishlists w ON wi.wishlist_id = w.id WHERE w.user_id = ${userId} AND wi.purchased_at IS NOT NULL
            UNION ALL
            SELECT r.created_at, 'account' FROM reviews r WHERE r.user_id = ${userId} AND r.is_deleted = false
            UNION ALL
            SELECT ua.created_at, 'account' FROM user_addresses ua WHERE ua.user_id = ${userId} AND ua.is_deleted = false
        )
        SELECT COUNT(*) as total
        FROM customer_activities
        WHERE activity_timestamp IS NOT NULL
        ${category !== 'all' ? sql`AND category = ${category}` : sql``}
    `;

  const [activitiesResult, countResult] = await Promise.all([
    db.execute(activityQuery),
    db.execute(countQuery),
  ]);

  const activities = (activitiesResult.rows as any[]).map(row => ({
    id: row.id,
    type: row.activity_type,
    title: row.title,
    description: row.description,
    amount: row.amount,
    timestamp: row.formatted_time,
    category: row.category,
    raw_timestamp: row.activity_timestamp,
  }));

  const total = parseInt((countResult.rows[0] as any)?.total || '0', 10);

  return { activities, total };
}

const handler = async (req: RequestWithUser, res: Response) => {
  const { id } = req.params as { id: string };
  const { limit, offset, category } = req.query as unknown as z.infer<typeof querySchema>;

  logger.info(`GET /customer/${id}/activity request received`);

  const result = await getCustomerActivity(id, limit, offset, category);

  logger.info(`Found ${result.activities.length} activities for customer ${id}`);

  ResponseFormatter.success(
    res,
    {
      activities: result.activities,
      pagination: {
        limit,
        offset,
        total: result.total,
        hasMore: offset + result.activities.length < result.total,
      },
    },
    'Customer activity retrieved successfully'
  );
};

const router = Router();
router.get(
  '/customer/:id/activity',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  validationMiddleware(querySchema, 'query'),
  requirePermission('users:read'),
  handler
);

export default router;
