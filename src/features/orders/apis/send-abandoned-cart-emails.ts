/**
 * POST /api/admin/abandoned-carts/send-email
 * Admin: Send recovery emails for abandoned carts
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { HttpException, ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../../cart/shared/carts.schema';
import { users } from '../../user/shared/user.schema';
import { notificationTemplates } from '../../notifications/shared/notification-templates.schema';
import { deliveryService } from '../../notifications/services/delivery.service';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const bodySchema = z.object({
    cart_ids: z.array(z.string().uuid()).min(1).max(100), // Max 100 carts at once
    template_id: z.string().uuid().optional(), // If not provided, use default abandoned cart template
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { cart_ids, template_id } = bodySchema.parse(req.body);

    // Get carts with user info
    const abandonedCarts = await db
        .select({
            cart_id: carts.id,
            user_id: carts.user_id,
            customer_email: users.email,
            customer_name: users.first_name,
            grand_total: carts.grand_total,
            abandoned_at: carts.abandoned_at,
        })
        .from(carts)
        .leftJoin(users, eq(carts.user_id, users.id))
        .where(and(
            inArray(carts.id, cart_ids),
            eq(carts.cart_status, 'abandoned'),
            eq(carts.is_deleted, false)
        ));

    if (abandonedCarts.length === 0) {
        throw new HttpException(404, 'No abandoned carts found');
    }

    // Get template (use default if not specified)
    let template;
    if (template_id) {
        [template] = await db
            .select()
            .from(notificationTemplates)
            .where(and(
                eq(notificationTemplates.id, template_id),
                eq(notificationTemplates.is_active, true)
            ));
    } else {
        // Get default abandoned cart template
        [template] = await db
            .select()
            .from(notificationTemplates)
            .where(and(
                eq(notificationTemplates.category, 'abandoned-cart'),
                eq(notificationTemplates.is_active, true)
            ))
            .limit(1);
    }

    if (!template) {
        throw new HttpException(404, 'Email template not found or inactive');
    }

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ cart_id: string; status: 'success' | 'failed'; error?: string }> = [];

    // Send emails
    for (const cart of abandonedCarts) {
        try {
            // Skip if no email
            if (!cart.customer_email || !cart.user_id) {
                failedCount++;
                results.push({
                    cart_id: cart.cart_id,
                    status: 'failed',
                    error: 'No customer email or user ID',
                });
                continue;
            }

            // Prepare template variables
            const variables = {
                customer_name: cart.customer_name || 'Valued Customer',
                cart_value: parseFloat(cart.grand_total || '0').toFixed(2),
                abandoned_date: cart.abandoned_at ? new Date(cart.abandoned_at).toLocaleDateString() : 'recently',
                cart_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cart`,
            };

            // Replace variables in template
            let emailHtml = template.body_html || '';
            let emailText = template.body_text || '';
            let emailSubject = template.subject || 'Your cart is waiting';

            Object.entries(variables).forEach(([key, value]) => {
                const placeholder = new RegExp(`{{${key}}}`, 'g');
                const stringValue = String(value);
                emailHtml = emailHtml.replace(placeholder, stringValue);
                emailText = emailText.replace(placeholder, stringValue);
                emailSubject = emailSubject.replace(placeholder, stringValue);
            });

            // Send email using delivery service
            const tempNotificationId = `temp-abandoned-cart-${cart.cart_id}-${Date.now()}`;
            await deliveryService.deliverNotification(
                tempNotificationId,
                cart.user_id,
                ['email'],
                {
                    title: emailSubject,
                    message: emailText,
                    emailSubject,
                    emailHtml,
                    emailText,
                }
            );

            // Update cart - mark email as sent
            await db
                .update(carts)
                .set({
                    recovery_email_sent: true,
                    recovery_email_sent_at: new Date(),
                })
                .where(eq(carts.id, cart.cart_id));

            sentCount++;
            results.push({
                cart_id: cart.cart_id,
                status: 'success',
            });

            logger.info('Abandoned cart recovery email sent', {
                cart_id: cart.cart_id,
                user_id: cart.user_id,
                email: cart.customer_email,
            });
        } catch (error) {
            failedCount++;
            results.push({
                cart_id: cart.cart_id,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            logger.error('Failed to send abandoned cart recovery email', {
                cart_id: cart.cart_id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return ResponseFormatter.success(res, {
        sent_count: sentCount,
        failed_count: failedCount,
        total: abandonedCarts.length,
        results,
    }, `Emails sent: ${sentCount} successful, ${failedCount} failed`);
};

const router = Router();
router.post('/admin/abandoned-carts/send-email', requireAuth, requirePermission('orders:write'), handler);

export default router;
