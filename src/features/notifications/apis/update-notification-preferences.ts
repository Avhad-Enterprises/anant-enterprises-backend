import { Request, Response, NextFunction } from 'express';
import { preferenceService } from '../services/preference.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';
import Joi from 'joi';

const updatePreferenceSchema = Joi.object({
    notification_type: Joi.string().required(),
    channel_email: Joi.boolean().optional(),
    channel_sms: Joi.boolean().optional(),
    channel_in_app: Joi.boolean().optional(),
    channel_push: Joi.boolean().optional(),
    frequency: Joi.string().valid('immediate', 'daily_digest', 'weekly_digest', 'never').optional(),
    quiet_hours_enabled: Joi.boolean().optional(),
    quiet_hours_start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().allow(null),
    quiet_hours_end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().allow(null),
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new HttpException(401, 'Unauthorized');
        }

        const { error, value } = updatePreferenceSchema.validate(req.body);
        if (error) {
            throw new HttpException(400, error.details[0].message);
        }

        const { notification_type, ...settings } = value;

        const updatedPreference = await preferenceService.updatePreference(
            userId,
            notification_type,
            settings
        );

        res.json({
            success: true,
            data: updatedPreference,
            message: 'Notification preferences updated successfully',
        });
    } catch (error) {
        logger.error('Failed to update notification preferences', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
