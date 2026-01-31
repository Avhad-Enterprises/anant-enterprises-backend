/**
 * GET /api/admin/abandoned-carts/email-templates
 * Admin: Get email templates for abandoned cart recovery
 */

import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { notificationTemplates } from '../../notifications/shared/notification-templates.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const handler = async (req: RequestWithUser, res: Response) => {
    // Get all active abandoned cart email templates
    const templates = await db
        .select({
            id: notificationTemplates.id,
            code: notificationTemplates.code,
            name: notificationTemplates.name,
            description: notificationTemplates.description,
            category: notificationTemplates.category,
            subject: notificationTemplates.subject,
            body_text: notificationTemplates.body_text,
            body_html: notificationTemplates.body_html,
            variables: notificationTemplates.variables,
            is_active: notificationTemplates.is_active,
            created_at: notificationTemplates.created_at,
            updated_at: notificationTemplates.updated_at,
        })
        .from(notificationTemplates)
        .where(and(
            eq(notificationTemplates.category, 'abandoned-cart'),
            eq(notificationTemplates.is_active, true)
        ))
        .orderBy(notificationTemplates.name);

    return ResponseFormatter.success(res, {
        templates,
        total: templates.length,
    }, 'Email templates retrieved successfully');
};

const router = Router();
router.get('/admin/abandoned-carts/email-templates', requireAuth, requirePermission('orders:read'), handler);

export default router;
