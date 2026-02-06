import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { updateCustomerSegment } from '../shared/queries';

const segmentSchema = z.object({
    segmentName: z.string().min(1).optional(),
    segmentCode: z.string().min(1).optional(),
    segmentDescription: z.string().optional(),
    segmentPurpose: z.enum(['marketing-campaign', 'email-campaign', 'sms-campaign', 'loyalty-program', 'risk-management', 'analytics']).optional(),
    segmentPriority: z.enum(['critical', 'high', 'normal', 'low']).optional(),
    segmentStatus: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    adminComment: z.string().optional(),
    rules: z.array(z.object({
        field: z.string(),
        condition: z.string(),
        value: z.string()
    })).optional(),
    matchType: z.enum(['all', 'any']).optional(),
    segmentType: z.enum(['manual', 'automated']).optional()
});

const handler = async (req: RequestWithUser, res: Response) => {
    const id = req.params.id as string;
    const data = segmentSchema.parse(req.body);

    const segment = await updateCustomerSegment(
        id,
        {
            name: data.segmentName,
            code: data.segmentCode,
            description: data.segmentDescription,
            purpose: data.segmentPurpose,
            priority: data.segmentPriority,
            status: data.segmentStatus,
            type: data.segmentType,
            match_type: data.matchType,
            admin_comment: data.adminComment,
            tags: data.tags,
            updated_by: req.userId
        },
        data.rules
    );

    ResponseFormatter.success(
        res,
        segment,
        'Customer segment updated successfully'
    );
};

const router = Router();
router.patch(
    '/:id',
    requireAuth,
    requirePermission('users:write'),
    handler
);

export default router;
