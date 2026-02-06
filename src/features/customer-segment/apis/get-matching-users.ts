import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, logger } from '../../../utils';
import { getMatchingUsersPreview } from '../shared/queries';

// Recursive schema for nested rules
const ruleSchema = z.object({
    field: z.string().optional(),
    operator: z.string().optional(), // Frontend might send 'operator' or 'condition'
    condition: z.string().optional(),
    value: z.string().optional()
});

// We need a manual type/schema definition for recursion in Zod if strictness is needed,
// but for simplicity and checking "type", we can allow flexible objects in the array
// and validate structure inside the query builder.
// However, let's try to be as specific as possible.
const groupSchema: z.ZodType<any> = z.lazy(() => z.object({
    matchType: z.enum(['all', 'any']).optional(),
    rules: z.array(z.union([ruleSchema, groupSchema])).optional()
}));

const previewSchema = z.object({
    segmentId: z.string().optional(),
    segmentType: z.enum(['manual', 'automated']).default('automated'),
    matchType: z.enum(['all', 'any']).default('all'), // Top level match type
    rules: z.array(z.union([ruleSchema, groupSchema])).default([]),
    limit: z.coerce.number().int().min(1).max(100).default(10), // Reduced default to 10 as per requirement
    page: z.coerce.number().int().min(1).default(1)
});

const handler = async (req: RequestWithUser, res: Response) => {
    // Log incoming payload for debugging
    logger.info('Preview API Request Payload:', req.body);

    try {
        const payload = previewSchema.parse(req.body);

        // If segmentType is manual, we shouldn't really evaluate rules unless requested
        // But the requirement says "Only allow preview for automated segments"
        // If type is manual, maybe we just return empty or current members?
        // User says: "Ensure manual segments skip rule evaluation"
        if (payload.segmentType === 'manual') {
            return ResponseFormatter.success(res, { count: 0, previewUsers: [] }, 'Manual segments do not use dynamic rules');
        }

        const { count, users } = await getMatchingUsersPreview(
            payload.matchType,
            payload.rules,
            payload.limit
        );

        return ResponseFormatter.success(
            res,
            {
                count,
                previewUsers: users,
                // Adding insights fields as requested
                estimatedUsers: count,
                lastRefreshed: new Date().toISOString()
            },
            'Matching users preview retrieved successfully'
        );
    } catch (error) {
        logger.error('Preview API Error:', error);
        return ResponseFormatter.error(res, 'PREVIEW_FAILED', 'Failed to preview matching users', 400, { error });
    }
};

const router = Router();
router.post(
    '/',
    requireAuth,
    requirePermission('users:read'),
    handler
);

export default router;
