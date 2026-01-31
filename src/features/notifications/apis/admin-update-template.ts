import { Request, Response, NextFunction } from 'express';
import { templateService } from '../services/template.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';
import Joi from 'joi';

const updateTemplateSchema = Joi.object({
    name: Joi.string().optional().max(255),
    description: Joi.string().optional().allow(''),
    category: Joi.string().optional().max(50),
    subject: Joi.string().optional().max(255),
    body_text: Joi.string().optional(),
    body_html: Joi.string().optional(),
    sms_template: Joi.string().optional(),
    in_app_title: Joi.string().optional().max(255),
    in_app_message: Joi.string().optional(),
    variables: Joi.array().items(Joi.string()).optional(),
    is_active: Joi.boolean().optional(),
});

/**
 * PUT /api/admin/notification-templates/:code
 * Update a notification template
 */
export const updateTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { code } = req.params as unknown as { code: string };

        const { error, value } = updateTemplateSchema.validate(req.body);
        if (error) {
            throw new HttpException(400, error.details[0].message);
        }

        // Check if template exists
        const existingTemplate = await templateService.getTemplateByCode(code);
        if (!existingTemplate) {
            throw new HttpException(404, 'Template not found');
        }

        const template = await templateService.upsertTemplate({
            code,
            ...value,
        });

        res.json({
            success: true,
            data: template,
            message: 'Template updated successfully',
        });
    } catch (error) {
        logger.error('Failed to update template', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
