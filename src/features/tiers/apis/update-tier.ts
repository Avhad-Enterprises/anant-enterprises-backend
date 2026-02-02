/**
 * PUT /api/tiers/:id
 * Update a tier (Admin only)
 */

import { Router, Response } from 'express';
import { ResponseFormatter, HttpException } from '../../../utils';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { updateTierSchema, tierIdParamSchema } from '../shared/validation';
import { findTierById, isTierCodeTaken, updateTierById } from '../shared/queries';
import { sanitizeTier } from '../shared/sanitizeTier';

const handler = async (req: RequestWithUser, res: Response) => {
    // Validate params
    const paramsValidation = tierIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
        throw new HttpException(400, 'Invalid tier ID', {
            details: paramsValidation.error.issues
        });
    }

    // Validate body
    const bodyValidation = updateTierSchema.safeParse(req.body);
    if (!bodyValidation.success) {
        throw new HttpException(400, 'Invalid request data', {
            details: bodyValidation.error.issues
        });
    }

    const { id } = paramsValidation.data;
    const data = bodyValidation.data;

    // Check if tier exists
    const existing = await findTierById(id);
    if (!existing) {
        throw new HttpException(404, 'Tier not found');
    }

    // If updating code, check for duplicates
    if (data.code && data.code !== existing.code) {
        const codeTaken = await isTierCodeTaken(data.code, id);
        if (codeTaken) {
            throw new HttpException(409, `Tier with code "${data.code}" already exists`);
        }
    }

    // Update tier
    const updated = await updateTierById(id, {
        ...data,
        updated_by: req.userId!,
    });

    if (!updated) {
        throw new HttpException(500, 'Failed to update tier');
    }

    return ResponseFormatter.success(
        res,
        sanitizeTier(updated),
        'Tier updated successfully'
    );
};

const router = Router();
router.put('/:id', requireAuth, requirePermission('tiers:update'), handler);

export default router;
