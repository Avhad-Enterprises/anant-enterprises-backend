import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
export const markNotificationAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new HttpException(401, 'Unauthorized');
        }

        const { id } = req.params as unknown as { id: string };

        const notification = await notificationService.markAsRead(id, userId);

        if (!notification) {
            throw new HttpException(404, 'Notification not found');
        }

        res.json({
            success: true,
            data: notification,
            message: 'Notification marked as read',
        });
    } catch (error) {
        logger.error('Failed to mark notification as read', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
