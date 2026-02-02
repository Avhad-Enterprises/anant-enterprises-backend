/**
 * GET /api/tags/:id
 * Get a single tag by ID
 * Public access
 */

import { Router, Response, Request } from 'express';
import { ResponseFormatter, HttpException } from '../../../utils';
import { tagIdParamSchema, findTagById, sanitizeTag } from '../shared';

const handler = async (req: Request, res: Response) => {
    const validation = tagIdParamSchema.safeParse(req.params);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid tag ID');
    }

    const { id } = validation.data;

    // Fetch tag
    const tag = await findTagById(id);
    if (!tag) {
        throw new HttpException(404, 'Tag not found');
    }

    return ResponseFormatter.success(
        res,
        sanitizeTag(tag),
        'Tag retrieved successfully'
    );
};

const router = Router();
router.get('/:id', handler);

export default router;
