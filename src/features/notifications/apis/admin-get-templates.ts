import { Request, Response, NextFunction } from 'express';
import { templateService } from '../services/template.service';
import { logger } from '../../../utils';

/**
 * GET /api/admin/notification-templates
 * Get all notification templates
 */
export const getAllTemplates = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { category, is_active } = req.query;

        const filters: any = {};

        if (category) {
            filters.category = category as string;
        }

        if (is_active !== undefined) {
            filters.isActive = is_active === 'true';
        }

        const templates = await templateService.getAllTemplates(filters);

        res.json({
            success: true,
            data: templates,
        });
    } catch (error) {
        logger.error('Failed to get templates', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
