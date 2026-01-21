import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
export const getUnreadCount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new HttpException(401, 'Unauthorized');
        }

        const count = await notificationService.getUnreadCount(userId);

        res.json({
            success: true,
            data: { count },
        });
    } catch (error) {
        logger.error('Failed to get unread count', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
