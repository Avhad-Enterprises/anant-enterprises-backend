import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';

// User endpoints
import { getUserNotifications } from './apis/get-user-notifications';
import { getNotificationById } from './apis/get-notification-by-id';
import { markNotificationAsRead } from './apis/mark-notification-read';
import { markAllNotificationsAsRead } from './apis/mark-all-notifications-read';
import { deleteNotification } from './apis/delete-notification';
import { getUnreadCount } from './apis/get-unread-count';
import { getNotificationPreferences } from './apis/get-notification-preferences';
import { updateNotificationPreferences } from './apis/update-notification-preferences';

// Admin endpoints
import { broadcastNotification } from './apis/admin-broadcast-notification';
import { getNotificationStats } from './apis/admin-get-stats';
import { getAllTemplates } from './apis/admin-get-templates';
import { createTemplate } from './apis/admin-create-template';
import { updateTemplate } from './apis/admin-update-template';

export class NotificationRoute {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // ====================================
        // USER ENDPOINTS
        // ====================================

        /**
         * GET /api/notifications
         * Get all notifications for authenticated user
         */
        this.router.get(
            '/',
            requireAuth,
            getUserNotifications
        );

        /**
         * GET /api/notifications/unread-count
         * Get unread notification count
         * Note: This must come BEFORE /:id route
         */
        this.router.get(
            '/unread-count',
            requireAuth,
            getUnreadCount
        );

        /**
         * GET /api/notifications/preferences
         * Get notification preferences
         */
        this.router.get(
            '/preferences',
            requireAuth,
            getNotificationPreferences
        );

        /**
         * PUT /api/notifications/preferences
         * Update notification preferences
         */
        this.router.put(
            '/preferences',
            requireAuth,
            updateNotificationPreferences
        );

        /**
         * PATCH /api/notifications/read-all
         * Mark all notifications as read
         */
        this.router.patch(
            '/read-all',
            requireAuth,
            markAllNotificationsAsRead
        );

        /**
         * GET /api/notifications/:id
         * Get single notification by ID
         */
        this.router.get(
            '/:id',
            requireAuth,
            getNotificationById
        );

        /**
         * PATCH /api/notifications/:id/read
         * Mark notification as read
         */
        this.router.patch(
            '/:id/read',
            requireAuth,
            markNotificationAsRead
        );

        /**
         * DELETE /api/notifications/:id
         * Delete notification
         */
        this.router.delete(
            '/:id',
            requireAuth,
            deleteNotification
        );

        // ====================================
        // ADMIN ENDPOINTS
        // ====================================

        /**
         * POST /api/admin/notifications/broadcast
         * Broadcast notification to multiple users
         */
        this.router.post(
            '/admin/broadcast',
            requireAuth,
            requirePermission('notifications:broadcast'),
            broadcastNotification
        );

        /**
         * GET /api/admin/notifications/stats
         * Get notification statistics
         */
        this.router.get(
            '/admin/stats',
            requireAuth,
            requirePermission('notifications:view_stats'),
            getNotificationStats
        );

        /**
         * GET /api/admin/notification-templates
         * Get all notification templates
         */
        this.router.get(
            '/admin/templates',
            requireAuth,
            requirePermission('notifications:manage_templates'),
            getAllTemplates
        );

        /**
         * POST /api/admin/notification-templates
         * Create notification template
         */
        this.router.post(
            '/admin/templates',
            requireAuth,
            requirePermission('notifications:manage_templates'),
            createTemplate
        );

        /**
         * PUT /api/admin/notification-templates/:code
         * Update notification template
         */
        this.router.put(
            '/admin/templates/:code',
            requireAuth,
            requirePermission('notifications:manage_templates'),
            updateTemplate
        );
    }
}

export default NotificationRoute;
