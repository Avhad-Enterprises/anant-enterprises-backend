/**
 * POST /api/tiers
 * Create a new tier (Admin only)
 */

import { Router, Response } from 'express';
import { ResponseFormatter, HttpException } from '../../../utils';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { 
    createTierSchema,
    validateTierHierarchy 
} from '../shared/validation';
import { 
    findTierByCode,
    getActiveParentTier,
    createTier as createTierQuery 
} from '../shared/queries';
import { sanitizeTier } from '../shared/sanitizeTier';
import { generateTierCode } from '../shared/utils';

const handler = async (req: RequestWithUser, res: Response) => {
    // Validate request body
    const validation = createTierSchema.safeParse(req.body);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid request data', {
            details: validation.error.issues
        });
    }

    const data = validation.data;
    const userId = req.userId!;

    // Generate code if not provided
    const code = data.code || generateTierCode(data.name);

    // Check code uniqueness
    const existingCode = await findTierByCode(code);
    if (existingCode) {
        throw new HttpException(409, `Tier with code "${code}" already exists`);
    }

    // Validate hierarchy if parent_id is provided
    let parentLevel: number | null = null;
    
    if (data.parent_id) {
        const parent = await getActiveParentTier(data.parent_id);
        
        if (!parent) {
            throw new HttpException(404, 'Parent tier not found or inactive');
        }
        
        parentLevel = parent.level;
    }

    // Validate tier hierarchy
    const hierarchyValidation = validateTierHierarchy(data.level, parentLevel);
    if (!hierarchyValidation.valid) {
        throw new HttpException(400, hierarchyValidation.error!);
    }

    // Create tier
    const newTier = await createTierQuery({
        name: data.name,
        code: code,
        description: data.description || null,
        level: data.level,
        parent_id: data.parent_id || null,
        priority: data.priority || 0,
        status: data.status,
        usage_count: 0,
        is_deleted: false,
        created_by: userId,
        updated_by: userId,
    });

    return ResponseFormatter.success(
        res,
        sanitizeTier(newTier),
        'Tier created successfully',
        201
    );
};

const router = Router();
router.post('/', requireAuth, requirePermission('tiers:create'), handler);

export default router;
