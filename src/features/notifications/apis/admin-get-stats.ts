import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { logger } from '../../../utils';

/**
 * GET /api/admin/notifications/stats
 * Get notification statistics
 */
export const getNotificationStats = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { start_date, end_date, type } = req.query;

        const filters: any = {};

        if (start_date) {
            filters.startDate = new Date(start_date as string);
        }

        if (end_date) {
            filters.endDate = new Date(end_date as string);
        }

        if (type) {
            filters.type = type as string;
        }

        const stats = await notificationService.getStats(filters);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        logger.error('Failed to get notification stats', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
