/**
 * GET /api/admin/abandoned-carts
 * Admin: Get all abandoned carts with filters
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc, count, gte, lte } from 'drizzle-orm';
import { ResponseFormatter, paginationSchema } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../../cart/shared/carts.schema';
import { cartItems } from '../../cart/shared/cart-items.schema';
import { users } from '../../user/shared/user.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const querySchema = paginationSchema.extend({
    search: z.string().optional(), // Search by customer name, email, or cart ID
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    sort_by: z.enum(['abandoned_at', 'grand_total', 'last_activity_at']).default('abandoned_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const params = querySchema.parse(req.query);
    const offset = (params.page - 1) * params.limit;

    // Build where conditions
    const conditions = [
        eq(carts.cart_status, 'abandoned'),
        eq(carts.is_deleted, false),
    ];

    if (params.from_date) {
        conditions.push(gte(carts.abandoned_at, new Date(params.from_date)));
    }

    if (params.to_date) {
        conditions.push(lte(carts.abandoned_at, new Date(params.to_date)));
    }

    // Get total count
    const [countResult] = await db
        .select({ total: count() })
        .from(carts)
        .where(and(...conditions));

    const total = countResult?.total || 0;

    // Determine sort column
    let orderByColumn;
    switch (params.sort_by) {
        case 'grand_total':
            orderByColumn = carts.grand_total;
            break;
        case 'last_activity_at':
            orderByColumn = carts.last_activity_at;
            break;
        case 'abandoned_at':
        default:
            orderByColumn = carts.abandoned_at;
            break;
    }

    // Get abandoned carts with user info
    const abandonedCarts = await db
        .select({
            cart_id: carts.id,
            user_id: carts.user_id,
            customer_name: users.name,
            customer_email: users.email,
            customer_phone: users.phone_number,
            cart_value: carts.grand_total,
            abandoned_at: carts.abandoned_at,
            last_activity_at: carts.last_activity_at,
            recovery_email_sent: carts.recovery_email_sent,
            recovery_email_sent_at: carts.recovery_email_sent_at,
            channel: carts.source,
            session_id: carts.session_id,
        })
        .from(carts)
        .leftJoin(users, eq(carts.user_id, users.id))
        .where(and(...conditions))
        .orderBy(params.sort_order === 'asc' ? orderByColumn : desc(orderByColumn))
        .limit(params.limit)
        .offset(offset);

    // Filter by search if provided
    let filteredCarts = abandonedCarts;
    if (params.search) {
        const searchLower = params.search.toLowerCase();
        filteredCarts = abandonedCarts.filter(cart =>
            cart.cart_id.toLowerCase().includes(searchLower) ||
            cart.customer_email?.toLowerCase().includes(searchLower) ||
            cart.customer_name?.toLowerCase().includes(searchLower)
        );
    }

    // Enrich with items
    const enrichedCarts = await Promise.all(
        filteredCarts.map(async (cart) => {
            // Get cart items
            const items = await db
                .select({
                    id: cartItems.id,
                    product_name: cartItems.product_name,
                    product_image_url: cartItems.product_image_url,
                    quantity: cartItems.quantity,
                    final_price: cartItems.final_price,
                    line_total: cartItems.line_total,
                })
                .from(cartItems)
                .where(and(
                    eq(cartItems.cart_id, cart.cart_id),
                    eq(cartItems.is_deleted, false)
                ));

            // Calculate recovery status
            let recoveryStatus: 'not-contacted' | 'email-sent' | 'recovered' = 'not-contacted';
            if (cart.recovery_email_sent) {
                recoveryStatus = 'email-sent';
            }

            // Calculate relative last activity time
            const lastActivityDate = cart.last_activity_at ? new Date(cart.last_activity_at) : new Date();
            const now = new Date();
            const diffMs = now.getTime() - lastActivityDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            let lastActivity = '';
            if (diffDays > 0) {
                lastActivity = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            } else if (diffHours > 0) {
                lastActivity = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else {
                lastActivity = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            }

            return {
                cart_id: cart.cart_id,
                customer_info: {
                    name: cart.customer_name || 'Guest',
                    email: cart.customer_email || cart.session_id ? `Guest (${cart.session_id?.substring(0, 8)}...)` : 'Unknown',
                    phone: cart.customer_phone,
                },
                cart_value: cart.cart_value,
                items_count: items.length,
                items,
                abandoned_at: cart.abandoned_at,
                last_activity: lastActivity,
                last_activity_at: cart.last_activity_at,
                recovery_status: recoveryStatus,
                recovery_email_sent_at: cart.recovery_email_sent_at,
                channel: cart.channel,
            };
        })
    );

    return ResponseFormatter.success(res, {
        carts: enrichedCarts,
        pagination: {
            page: params.page,
            limit: params.limit,
            total,
            totalPages: Math.ceil(total / params.limit),
        },
    }, 'Abandoned carts retrieved successfully');
};

const router = Router();
router.get('/admin/abandoned-carts', requireAuth, requirePermission('orders:read'), handler);

export default router;
