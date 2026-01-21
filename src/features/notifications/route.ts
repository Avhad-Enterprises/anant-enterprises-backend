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
import { testNotification } from './apis/test-notification.api';

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
            '/notifications',
            requireAuth,
            getUserNotifications
        );

        /**
         * GET /api/notifications/unread/count
         * Get unread notification count
         * Note: This must come BEFORE /:id route
         */
        this.router.get(
            '/notifications/unread/count',
            requireAuth,
            getUnreadCount
        );

        /**
         * GET /api/notifications/test
         * Test endpoint to manually trigger a notification
         * Useful for debugging WebSocket real-time notifications
         */
        this.router.get(
            '/notifications/test',
            requireAuth,
            testNotification
        );

        /**
         * GET /api/notifications/preferences
         * Get notification preferences
         */
        this.router.get(
            '/notifications/preferences',
            requireAuth,
            getNotificationPreferences
        );

        /**
         * PUT /api/notifications/preferences
         * Update notification preferences
         */
        this.router.put(
            '/notifications/preferences',
            requireAuth,
            updateNotificationPreferences
        );

        /**
         * POST /api/notifications/mark-all-read
         * Mark all notifications as read
         */
        this.router.post(
            '/notifications/mark-all-read',
            requireAuth,
            markAllNotificationsAsRead
        );

        /**
         * GET /api/notifications/:id
         * Get single notification by ID
         */
        this.router.get(
            '/notifications/:id',
            requireAuth,
            getNotificationById
        );

        /**
         * PATCH /api/notifications/:id/read
         * Mark notification as read
         */
        this.router.patch(
            '/notifications/:id/read',
            requireAuth,
            markNotificationAsRead
        );

        /**
         * DELETE /api/notifications/:id
         * Delete notification
         */
        this.router.delete(
            '/notifications/:id',
            requireAuth,
            deleteNotification
        );

        // ====================================
        // ADMIN ENDPOINTS
        // ====================================

        /**
         * POST /api/notifications/admin/broadcast
         * Broadcast notification to multiple users
         */
        this.router.post(
            '/notifications/admin/broadcast',
            requireAuth,
            requirePermission('notifications:broadcast'),
            broadcastNotification
        );

        /**
         * GET /api/notifications/admin/stats
         * Get notification statistics
         */
        this.router.get(
            '/notifications/admin/stats',
            requireAuth,
            requirePermission('notifications:view_stats'),
            getNotificationStats
        );

        /**
         * GET /api/notifications/admin/templates
         * Get all notification templates
         */
        this.router.get(
            '/notifications/admin/templates',
            requireAuth,
            requirePermission('notifications:manage_templates'),
            getAllTemplates
        );

        /**
         * POST /api/notifications/admin/templates
         * Create notification template
         */
        this.router.post(
            '/notifications/admin/templates',
            requireAuth,
            requirePermission('notifications:manage_templates'),
            createTemplate
        );

        /**
         * PUT /api/notifications/admin/templates/:code
         * Update notification template
         */
        this.router.put(
            '/notifications/admin/templates/:code',
            requireAuth,
            requirePermission('notifications:manage_templates'),
            updateTemplate
        );
    }
}

export default NotificationRoute;
