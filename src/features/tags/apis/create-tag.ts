/**
 * POST /api/tags
 * Create a new tag
 * Admin only
 */

import { Router, Response } from 'express';
import { ResponseFormatter, HttpException } from '../../../utils';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { createTagSchema, isTagNameTaken, createTag, sanitizeTag } from '../shared';

const handler = async (req: RequestWithUser, res: Response) => {
    // Validate request body
    const validation = createTagSchema.safeParse(req.body);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid request data', {
            details: validation.error.issues,
        });
    }

    const data = validation.data;

    // Check if tag already exists
    const exists = await isTagNameTaken(data.name);
    if (exists) {
        throw new HttpException(409, `Tag "${data.name}" already exists`);
    }

    // Create tag
    const newTag = await createTag({
        name: data.name,
        type: data.type,
        status: data.status,
        usage_count: 0,
        created_by: req.userId,
    });

    return ResponseFormatter.success(
        res,
        sanitizeTag(newTag),
        'Tag created successfully',
        201
    );
};

const router = Router();
router.post('/', requireAuth, requirePermission('tags:create'), handler);

export default router;
