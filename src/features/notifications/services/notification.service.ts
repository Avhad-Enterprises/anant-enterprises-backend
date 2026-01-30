import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '../../../database';
import { notifications } from '../shared/notifications.schema';
import { users } from '../../user/shared/user.schema';
import { logger } from '../../../utils';
import { templateService } from './template.service';
import { preferenceService } from './preference.service';
import { deliveryService } from './delivery.service';
import type { CreateNotificationInput, GetNotificationsOptions } from '../shared/types';
import { socketService } from '../socket/socket.service';

class NotificationService {
    /**
     * Get the auth_id for a user from their database id
     * This is needed because WebSocket rooms are keyed by auth_id (Supabase Auth ID)
     * but notifications are created using the database user ID
     */
    private async getAuthIdFromUserId(userId: string): Promise<string | null> {
        try {
            const result = await db
                .select({ auth_id: users.auth_id })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            return result[0]?.auth_id ?? null;
        } catch (error) {
            logger.error('Failed to get auth_id from userId', { userId, error });
            return null;
        }
    }
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
                    // WebSocket rooms are keyed by auth_id (Supabase Auth ID)
                    // We need to look up the auth_id from the database user id
                    const authId = await this.getAuthIdFromUserId(userId);
                    
                    if (authId) {
                        socketService.emitToUser(authId, 'notification:new', {
                            notification: {
                                id: notification.id,
                                type: notification.type,
                                title: notification.title,
                                message: notification.message,
                                priority: notification.priority,
                                action_url: notification.action_url,
                                action_text: notification.action_text,
                                created_at: notification.created_at,
                                is_read: false,
                            },
                        });

                        logger.info('Notification broadcasted via WebSocket', {
                            userId,
                            authId,
                            notificationId: notification.id,
                            templateCode,
                        });
                    } else {
                        logger.warn('Could not find auth_id for user, WebSocket notification skipped', {
                            userId,
                            notificationId: notification.id,
                        });
                    }
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
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }

    /**
     * Create a notification manually (without template)
     */
    async create(input: CreateNotificationInput) {
        logger.info('Creating notification with input', {
            userId: input.userId,
            type: input.type,
            actionUrl: input.actionUrl,
            actionText: input.actionText,
        });
        
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
            action_url: notification.action_url,
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
     * Maps template codes to valid notification_type enum values
     */
    private templateCodeToNotificationType(templateCode: string): string {
        // Map template codes to valid notification types
        const templateToTypeMap: Record<string, string> = {
            'ORDER_CREATED': 'order_created',
            'NEW_ORDER_RECEIVED': 'order_created', // Admin version uses same type
            'ORDER_SHIPPED': 'order_shipped',
            'ORDER_DELIVERED': 'order_delivered',
            'PAYMENT_CAPTURED': 'payment_captured',
            'LOW_STOCK_ALERT': 'inventory_low_stock',
            'USER_WELCOME': 'user_welcome',
        };

        return templateToTypeMap[templateCode] || templateCode.toLowerCase();
    }
}

export const notificationService = new NotificationService();
