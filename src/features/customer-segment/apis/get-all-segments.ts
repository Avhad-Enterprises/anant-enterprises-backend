import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { getCustomerSegments, getSegmentRules } from '../shared/queries';

const handler = async (req: RequestWithUser, res: Response) => {
    const segments = await getCustomerSegments();

    // Transform to match frontend expectations and add counts
    const transformedSegments = await Promise.all(
        segments.map(async (segment) => {
            const rules = await getSegmentRules(segment.id);

            // Use stored count for better performance, or fallback to calculation if needed
            // For manual segments, estimated_users handles the member count if we sync it
            const count = segment.estimated_users ?? 0;

            return {
                id: segment.id,
                segmentName: segment.name,
                type: segment.type === 'automated' ? 'Automated' : 'Manual',
                purpose: segment.purpose,
                priority: segment.priority,
                createdBy: segment.created_by || 'Admin', // Placeholder until real admin profile join
                createdAt: segment.created_at.toISOString(),
                filters: rules.map(r => r.field), // Map fields as "filters" array for frontend
                filteredUsers: count,
                estimatedUsers: count,
                lastRefreshed: segment.last_refreshed_at ? segment.last_refreshed_at.toISOString() : segment.updated_at.toISOString(),
            };
        })
    );

    ResponseFormatter.success(
        res,
        transformedSegments,
        'Customer segments retrieved successfully'
    );
};

const router = Router();
router.get(
    '/',
    requireAuth,
    requirePermission('users:read'), // Assuming same permission as users
    handler
);

export default router;
