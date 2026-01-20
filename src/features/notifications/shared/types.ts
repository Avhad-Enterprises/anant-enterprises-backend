/**
 * Notification Service Types
 */

export interface CreateNotificationInput {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    actionText?: string;
    channels?: string[];
}

export interface GetNotificationsOptions {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
}

export interface RenderTemplateResult {
    type: string;
    title: string;
    message: string;
    emailSubject?: string;
    emailHtml?: string;
    emailText?: string;
    smsMessage?: string;
}

export interface DeliveryResult {
    channel: string;
    success: boolean;
    messageId?: string;
    error?: string;
}
