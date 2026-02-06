import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { deleteCustomerSegment } from '../shared/queries';

const handler = async (req: RequestWithUser, res: Response) => {
    const id = req.params.id as string;

    const segment = await deleteCustomerSegment(id, req.userId);

    if (!segment || segment.length === 0) {
        return ResponseFormatter.error(res, 'NOT_FOUND', 'Segment not found');
    }

    return ResponseFormatter.success(
        res,
        null,
        'Customer segment deleted successfully'
    );
};

const router = Router();
router.delete(
    '/:id',
    requireAuth,
    requirePermission('users:write'),
    handler
);

export default router;
