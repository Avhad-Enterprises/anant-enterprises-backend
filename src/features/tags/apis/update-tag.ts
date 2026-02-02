/**
 * PUT /api/tags/:id
 * Update a tag
 * Admin only
 */

import { Router, Response } from 'express';
import { ResponseFormatter, HttpException } from '../../../utils';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import {
    tagIdParamSchema,
    updateTagSchema,
    findTagById,
    isTagNameTaken,
    updateTagById,
    sanitizeTag,
} from '../shared';

const handler = async (req: RequestWithUser, res: Response) => {
    // Validate params
    const paramsValidation = tagIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
        throw new HttpException(400, 'Invalid tag ID');
    }

    // Validate body
    const bodyValidation = updateTagSchema.safeParse(req.body);
    if (!bodyValidation.success) {
        throw new HttpException(400, 'Invalid request data', {
            details: bodyValidation.error.issues,
        });
    }

    const { id } = paramsValidation.data;
    const data = bodyValidation.data;

    // Check if tag exists
    const existing = await findTagById(id);
    if (!existing) {
        throw new HttpException(404, 'Tag not found');
    }

    // If updating name, check for duplicates
    if (data.name) {
        const nameTaken = await isTagNameTaken(data.name, id);
        if (nameTaken) {
            throw new HttpException(409, `Tag "${data.name}" already exists`);
        }
    }

    // Update tag
    const updated = await updateTagById(id, {
        ...data,
        updated_by: req.userId,
    });

    if (!updated) {
        throw new HttpException(500, 'Failed to update tag');
    }

    return ResponseFormatter.success(
        res,
        sanitizeTag(updated),
        'Tag updated successfully'
    );
};

const router = Router();
router.put('/:id', requireAuth, requirePermission('tags:update'), handler);

export default router;
