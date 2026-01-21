import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services';
import { logger } from '../../../utils';

/**
 * Test endpoint to manually trigger a notification
 * GET /api/notifications/test
 * 
 * This endpoint allows you to test the real-time notification system
 * by creating a test notification that will be sent via WebSocket.
 */
export const testNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.userId!;

        logger.info('Creating test notification', { userId });

        // Create notification using template (this will emit WebSocket event)
        const notification = await notificationService.createFromTemplate(
            userId,
            'user_welcome',
            {
                userName: 'Test User',
            },
            {
                priority: 'high',
                actionUrl: '/notifications',
                actionText: 'View All',
            }
        );

        logger.info('Test notification created', {
            notificationId: notification?.id,
            userId,
        });

        res.json({
            success: true,
            message: 'Test notification sent! Check your browser for the toast popup.',
            notification,
            debug: {
                userId,
                notificationId: notification?.id,
                channels: notification?.channels,
            },
        });
    } catch (error) {
        logger.error('Failed to create test notification', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
