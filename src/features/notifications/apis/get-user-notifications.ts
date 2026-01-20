import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 */
export const getUserNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new HttpException(401, 'Unauthorized');
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const unreadOnly = req.query.unread_only === 'true';

        const offset = (page - 1) * limit;

        const notifications = await notificationService.getUserNotifications(userId, {
            limit,
            offset,
            unreadOnly,
        });

        const unreadCount = await notificationService.getUnreadCount(userId);

        res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    page,
                    limit,
                    hasMore: notifications.length === limit,
                },
                unreadCount,
            },
        });
    } catch (error) {
        logger.error('Failed to get user notifications', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
