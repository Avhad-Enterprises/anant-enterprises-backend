import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new HttpException(401, 'Unauthorized');
        }

        await notificationService.markAllAsRead(userId);

        res.json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        logger.error('Failed to mark all notifications as read', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
