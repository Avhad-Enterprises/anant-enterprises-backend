/**
 * GET /api/products/:id
 * Get product by ID
 * - Public can view active products
 * - Admins can view all products
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { sanitizeProduct } from '../shared/sanitizeProduct';
import { HttpException } from '../../../utils';
import { productCacheService } from '../services/product-cache.service';
import { IProduct } from '../shared/interface';
import { rbacCacheService } from '../../rbac';

const paramsSchema = z.object({
    id: z.string().uuid('Invalid product ID format'),
});

async function getProductById(id: string, userId?: number): Promise<IProduct> {
    const product = await productCacheService.getProductById(id);

    if (!product) {
        throw new HttpException(404, 'Product not found');
    }

    // If product is not active, require admin permission
    if (product.status !== 'active') {
        if (!userId) {
            throw new HttpException(401, 'Authentication required to view this product');
        }

        const hasPermission = await rbacCacheService.hasPermission(userId, 'products:read');
        if (!hasPermission) {
            throw new HttpException(403, 'You do not have permission to view draft/archived products');
        }
    }

    return product as IProduct;
}

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = req.params;
    const userId = req.userId; // May be undefined for public access

    const product = await getProductById(id, userId);
    const productResponse = sanitizeProduct(product);

    ResponseFormatter.success(res, productResponse, 'Product retrieved successfully');
};

const router = Router();
router.get(
    '/:id',
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
