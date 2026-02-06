import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { createCustomerSegment } from '../shared/queries';

const segmentSchema = z.object({
    segmentName: z.string().min(1),
    segmentCode: z.string().min(1),
    segmentDescription: z.string().optional().default(''),
    segmentPurpose: z.enum(['marketing-campaign', 'email-campaign', 'sms-campaign', 'loyalty-program', 'risk-management', 'analytics']).default('marketing-campaign'),
    segmentPriority: z.enum(['critical', 'high', 'normal', 'low']).default('normal'),
    segmentStatus: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
    adminComment: z.string().optional().default(''),
    rules: z.array(z.object({
        field: z.string(),
        condition: z.string(),
        value: z.string()
    })).default([]),
    matchType: z.enum(['all', 'any']).default('all'),
    segmentType: z.enum(['manual', 'automated']).default('automated')
});

const handler = async (req: RequestWithUser, res: Response) => {
    try {
        const data = segmentSchema.parse(req.body);

        const segment = await createCustomerSegment(
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
                created_by: req.userId
            },
            data.rules
        );

        return ResponseFormatter.success(
            res,
            segment,
            'Customer segment created successfully',
            201
        );
    } catch (error: any) {
        // Handle database unique constraint violation (e.g., duplicate segment code)
        if (error.code === '23505') {
            return ResponseFormatter.error(
                res,
                'UNIQUE_CONSTRAINT_VIOLATION',
                'A segment with this code already exists. Please use a unique code.',
                400
            );
        }

        // Handle database foreign key violation
        if (error.code === '23503') {
            return ResponseFormatter.error(
                res,
                'FOREIGN_KEY_VIOLATION',
                'Reference error: One or more related records (e.g. user) could not be found.',
                400
            );
        }

        // Rethrow for global error handler if not a specific DB error
        throw error;
    }
};

const router = Router();
router.post(
    '/',
    requireAuth,
    requirePermission('users:write'),
    handler
);

export default router;
