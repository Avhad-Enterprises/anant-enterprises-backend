import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
export const deleteNotification = async (
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

        const notification = await notificationService.deleteNotification(id, userId);

        if (!notification) {
            throw new HttpException(404, 'Notification not found');
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully',
        });
    } catch (error) {
        logger.error('Failed to delete notification', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
