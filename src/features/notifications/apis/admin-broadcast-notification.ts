import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';
import Joi from 'joi';

const broadcastSchema = Joi.object({
    user_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
    title: Joi.string().required().max(255),
    message: Joi.string().required().max(5000),
    type: Joi.string().optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    action_url: Joi.string().uri().optional(),
    action_text: Joi.string().max(100).optional(),
    channels: Joi.array().items(Joi.string().valid('in_app', 'email', 'sms', 'push')).optional(),
});

/**
 * POST /api/admin/notifications/broadcast
 * Broadcast notification to multiple users
 */
export const broadcastNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { error, value } = broadcastSchema.validate(req.body);
        if (error) {
            throw new HttpException(400, error.details[0].message);
        }

        const { user_ids, ...notificationData } = value;

        const notifications = await notificationService.broadcast(user_ids, notificationData);

        res.json({
            success: true,
            data: {
                sent: notifications.length,
                notifications,
            },
            message: `Broadcast sent to ${notifications.length} users`,
        });
    } catch (error) {
        logger.error('Failed to broadcast notification', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
