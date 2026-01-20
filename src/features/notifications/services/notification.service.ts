import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '../../../database';
import { notifications } from '../shared/notifications.schema';
import { logger } from '../../../utils';
import { templateService } from './template.service';
import { preferenceService } from './preference.service';
import { deliveryService } from './delivery.service';
import type { CreateNotificationInput, GetNotificationsOptions } from '../shared/types';
import { socketService } from '../socket/socket.service';

class NotificationService {
    /**
     * Create a notification from a template
     * Handles preference checking, rendering, and delivery
     */
    async createFromTemplate(
        userId: string,
        templateCode: string,
        variables: Record<string, any>,
        options?: {
            priority?: 'low' | 'normal' | 'high' | 'urgent';
            actionUrl?: string;
            actionText?: string;
            expiresAt?: Date;
        }
    ) {
        try {
            // Get user preferences for this notification type
            const preference = await preferenceService.getUserPreferences(
                userId,
                this.templateCodeToNotificationType(templateCode)
            );

            // Check if user has disabled this notification type
            if (preference.frequency === 'never') {
                logger.info('Notification skipped - user preference set to never', {
                    userId,
                    templateCode,
                });
                return null;
            }

            // Check quiet hours
            if (preferenceService.isWithinQuietHours(preference)) {
                logger.info('Notification delayed - within quiet hours', {
                    userId,
                    templateCode,
                });
                // TODO: Queue for later delivery
                return null;
            }

            // Render template
            const rendered = await templateService.renderTemplate(templateCode, variables);

            // Determine active channels
            const activeChannels = preferenceService.getActiveChannels(preference);

            if (activeChannels.length === 0) {
                logger.warn('No active channels for user', { userId, templateCode });
                return null;
            }

            // Create notification in database
            const notification = await this.create({
                userId,
                type: this.templateCodeToNotificationType(templateCode),
                title: rendered.title,
                message: rendered.message,
                data: variables,
                channels: activeChannels,
                priority: options?.priority,
                actionUrl: options?.actionUrl,
                actionText: options?.actionText,
            });

            // Deliver to channels (async, non-blocking)
            setImmediate(() => {
                deliveryService.deliverNotification(
                    notification.id,
                    userId,
                    activeChannels.filter(c => c !== 'in_app'), // in_app already stored
                    {
                        title: rendered.title,
                        message: rendered.message,
                        emailSubject: rendered.emailSubject,
                        emailHtml: rendered.emailHtml,
                        emailText: rendered.emailText,
                        smsMessage: rendered.smsMessage,
                    }
                ).catch(error => {
                    logger.error('Async notification delivery failed', {
                        notificationId: notification.id,
                        error
                    });
                });
            });

            // 🔥 NEW: Broadcast to user via WebSocket (real-time)
            try {
                if (socketService.isInitialized()) {
                    socketService.emitToUser(userId, 'notification:new', {
                        id: notification.id,
                        type: notification.type,
                        title: notification.title,
                        message: notification.message,
                        priority: notification.priority,
                        actionUrl: notification.action_url,
                        actionText: notification.action_text,
                        createdAt: notification.created_at,
                        isRead: false,
                    });

                    logger.info('Notification broadcasted via WebSocket', {
                        userId,
                        notificationId: notification.id,
                        templateCode,
                    });
                }
            } catch (error) {
                // Non-blocking: if WebSocket fails, notification still saved
                logger.error('Failed to broadcast notification via WebSocket', {
                    error,
                    userId,
                    notificationId: notification.id,
                });
            }

            return notification;
        } catch (error) {
            logger.error('Failed to create notification from template', {
                userId,
                templateCode,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Create a notification manually (without template)
     */
    async create(input: CreateNotificationInput) {
        const [notification] = await db
            .insert(notifications)
            .values({
                user_id: input.userId,
                type: input.type as any,
                title: input.title,
                message: input.message,
                data: input.data || {},
                channels: input.channels || ['in_app'],
                priority: (input.priority || 'normal') as any,
                action_url: input.actionUrl,
                action_text: input.actionText,
            })
            .returning();

        logger.info('Notification created', {
            id: notification.id,
            userId: input.userId,
            type: input.type,
        });

        return notification;
    }

    /**
     * Get notifications for a user
     */
    async getUserNotifications(
        userId: string,
        options: GetNotificationsOptions = {}
    ) {
        const { limit = 20, offset = 0, unreadOnly = false } = options;

        const conditions = [
            eq(notifications.user_id, userId),
            isNull(notifications.deleted_at),
        ];

        if (unreadOnly) {
            conditions.push(eq(notifications.is_read, false));
        }

        const results = await db
            .select()
            .from(notifications)
            .where(and(...conditions))
            .orderBy(desc(notifications.created_at))
            .limit(limit)
            .offset(offset);

        return results;
    }

    /**
     * Get single notification by ID
     */
    async getNotificationById(id: string, userId: string) {
        const [notification] = await db
            .select()
            .from(notifications)
            .where(
                and(
                    eq(notifications.id, id),
                    eq(notifications.user_id, userId),
                    isNull(notifications.deleted_at)
                )
            )
            .limit(1);

        return notification || null;
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id: string, userId: string) {
        const [updated] = await db
            .update(notifications)
            .set({
                is_read: true,
                read_at: new Date(),
            })
            .where(
                and(
                    eq(notifications.id, id),
                    eq(notifications.user_id, userId),
                    isNull(notifications.deleted_at)
                )
            )
            .returning();

        if (updated) {
            logger.info('Notification marked as read', { id, userId });
        }

        return updated || null;
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string) {
        const result = await db
            .update(notifications)
            .set({
                is_read: true,
                read_at: new Date(),
            })
            .where(
                and(
                    eq(notifications.user_id, userId),
                    eq(notifications.is_read, false),
                    isNull(notifications.deleted_at)
                )
            );

        logger.info('All notifications marked as read', { userId });
        return result;
    }

    /**
     * Soft delete a notification
     */
    async deleteNotification(id: string, userId: string) {
        const [deleted] = await db
            .update(notifications)
            .set({
                deleted_at: new Date(),
            })
            .where(
                and(
                    eq(notifications.id, id),
                    eq(notifications.user_id, userId),
                    isNull(notifications.deleted_at)
                )
            )
            .returning();

        if (deleted) {
            logger.info('Notification deleted', { id, userId });
        }

        return deleted || null;
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(userId: string): Promise<number> {
        const result = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(notifications)
            .where(
                and(
                    eq(notifications.user_id, userId),
                    eq(notifications.is_read, false),
                    isNull(notifications.deleted_at)
                )
            );

        return result[0]?.count || 0;
    }

    /**
     * Broadcast notification to multiple users (admin use)
     */
    async broadcast(
        userIds: string[],
        data: {
            title: string;
            message: string;
            type?: string;
            priority?: 'low' | 'normal' | 'high' | 'urgent';
            actionUrl?: string;
            actionText?: string;
            channels?: string[];
        }
    ) {
        const notificationData = userIds.map(userId => ({
            user_id: userId,
            type: (data.type || 'admin_broadcast') as any,
            title: data.title,
            message: data.message,
            priority: (data.priority || 'normal') as any,
            action_url: data.actionUrl,
            action_text: data.actionText,
            channels: data.channels || ['in_app'],
            data: {},
        }));

        const results = await db
            .insert(notifications)
            .values(notificationData)
            .returning();

        logger.info('Broadcast notification sent', {
            userCount: userIds.length,
            type: data.type,
        });

        return results;
    }

    /**
     * Get notification statistics (admin use)
     */
    async getStats(filters?: {
        startDate?: Date;
        endDate?: Date;
        type?: string;
    }) {
        const conditions = [isNull(notifications.deleted_at)];

        if (filters?.startDate) {
            conditions.push(sql`${notifications.created_at} >= ${filters.startDate}`);
        }

        if (filters?.endDate) {
            conditions.push(sql`${notifications.created_at} <= ${filters.endDate}`);
        }

        if (filters?.type) {
            conditions.push(eq(notifications.type, filters.type as any));
        }

        const [stats] = await db
            .select({
                total: sql<number>`count(*)::int`,
                unread: sql<number>`count(*) filter (where ${notifications.is_read} = false)::int`,
                read: sql<number>`count(*) filter (where ${notifications.is_read} = true)::int`,
            })
            .from(notifications)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        return stats || { total: 0, unread: 0, read: 0 };
    }

    /**
     * Helper: Convert template code to notification type
     */
    private templateCodeToNotificationType(templateCode: string): string {
        return templateCode.toLowerCase();
    }
}

export const notificationService = new NotificationService();
