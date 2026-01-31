import { Request, Response, NextFunction } from 'express';
import { templateService } from '../services/template.service';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';
import Joi from 'joi';

const createTemplateSchema = Joi.object({
    code: Joi.string().required().uppercase(),
    name: Joi.string().required().max(255),
    description: Joi.string().optional().allow(''),
    category: Joi.string().optional().max(50),
    subject: Joi.string().optional().max(255),
    body_text: Joi.string().optional(),
    body_html: Joi.string().optional(),
    sms_template: Joi.string().optional(),
    in_app_title: Joi.string().optional().max(255),
    in_app_message: Joi.string().optional(),
    variables: Joi.array().items(Joi.string()).optional(),
    is_active: Joi.boolean().optional().default(true),
});

/**
 * POST /api/admin/notification-templates
 * Create a new notification template
 */
export const createTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { error, value } = createTemplateSchema.validate(req.body);
        if (error) {
            throw new HttpException(400, error.details[0].message);
        }

        const template = await templateService.upsertTemplate(value);

        res.status(201).json({
            success: true,
            data: template,
            message: 'Template created successfully',
        });
    } catch (error) {
        logger.error('Failed to create template', {
            error: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
};
