import { Request, Response, NextFunction } from 'express';
import { preferenceService } from '../services/preference.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';

/**
 * GET /api/notifications/preferences
 * Get all notification preferences for the authenticated user
 */
export const getNotificationPreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const preferences = await preferenceService.getAllUserPreferences(userId);

        // If no preferences exist, return defaults
        if (preferences.length === 0) {
            await preferenceService.initializeUserPreferences(userId);
            const newPreferences = await preferenceService.getAllUserPreferences(userId);

            res.json({
                success: true,
                data: newPreferences,
            });
            return;
        }

        res.json({
            success: true,
            data: preferences,
        });
    } catch (error) {
        logger.error('Failed to get notification preferences', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
