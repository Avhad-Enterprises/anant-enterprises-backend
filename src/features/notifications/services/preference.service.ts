import { eq, and } from 'drizzle-orm';
import { db } from '../../../database';
import { notificationPreferences } from '../shared/notification-preferences.schema';
import { logger } from '../../../utils';
import type { NotificationType } from '../shared/notifications.schema';

class PreferenceService {
    /**
     * Get user preferences for a specific notification type
     * Returns default preferences if none exist
     */
    async getUserPreferences(
        userId: string,
        notificationType: string
    ) {
        const [preference] = await db
            .select()
            .from(notificationPreferences)
            .where(
                and(
                    eq(notificationPreferences.user_id, userId),
                    eq(notificationPreferences.notification_type, notificationType as any)
                )
            )
            .limit(1);

        // Return default preferences if none exist
        if (!preference) {
            return this.getDefaultPreferences();
        }

        return preference;
    }

    /**
     * Get all preferences for a user
     */
    async getAllUserPreferences(userId: string) {
        return await db
            .select()
            .from(notificationPreferences)
            .where(eq(notificationPreferences.user_id, userId));
    }

    /**
     * Update user preference for a notification type
     */
    async updatePreference(
        userId: string,
        notificationType: string,
        settings: {
            channel_email?: boolean;
            channel_sms?: boolean;
            channel_in_app?: boolean;
            channel_push?: boolean;
            frequency?: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never';
            quiet_hours_enabled?: boolean;
            quiet_hours_start?: string;
            quiet_hours_end?: string;
        }
    ) {
        const [result] = await db
            .insert(notificationPreferences)
            .values({
                user_id: userId,
                notification_type: notificationType as any,
                ...settings,
            })
            .onConflictDoUpdate({
                target: [
                    notificationPreferences.user_id,
                    notificationPreferences.notification_type,
                ],
                set: {
                    ...settings,
                    updated_at: new Date(),
                },
            })
            .returning();

        logger.info('Notification preference updated', {
            userId,
            notificationType
        });

        return result;
    }

    /**
     * Initialize default preferences for a new user
     */
    async initializeUserPreferences(userId: string) {
        const notificationTypes: NotificationType[] = [
            'order_created',
            'order_shipped',
            'order_delivered',
            'payment_captured',
            'user_welcome',
        ];

        const defaultSettings = this.getDefaultPreferences();

        const insertPromises = notificationTypes.map(type =>
            db
                .insert(notificationPreferences)
                .values({
                    user_id: userId,
                    notification_type: type,
                    ...defaultSettings,
                })
                .onConflictDoNothing()
        );

        await Promise.all(insertPromises);

        logger.info('User notification preferences initialized', { userId });
    }

    /**
     * Get default notification preferences
     */
    getDefaultPreferences() {
        return {
            channel_email: true,
            channel_sms: false,
            channel_in_app: true,
            channel_push: true,
            frequency: 'immediate' as const,
            quiet_hours_enabled: false,
            quiet_hours_start: null,
            quiet_hours_end: null,
        };
    }

    /**
     * Check if a notification should be sent based on quiet hours
     */
    isWithinQuietHours(preference: any): boolean {
        if (!preference.quiet_hours_enabled) {
            return false;
        }

        if (!preference.quiet_hours_start || !preference.quiet_hours_end) {
            return false;
        }

        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const start = preference.quiet_hours_start;
        const end = preference.quiet_hours_end;

        // Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if (start > end) {
            return currentTime >= start || currentTime <= end;
        }

        return currentTime >= start && currentTime <= end;
    }

    /**
     * Determine which channels should be used based on preferences
     */
    getActiveChannels(preference: any): string[] {
        const channels: string[] = [];

        if (preference.channel_in_app) channels.push('in_app');
        if (preference.channel_email) channels.push('email');
        if (preference.channel_sms) channels.push('sms');
        if (preference.channel_push) channels.push('push');

        return channels;
    }
}

export const preferenceService = new PreferenceService();
