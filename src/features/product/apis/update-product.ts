/**
 * PUT /api/products/:id
 * Update product (Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { sanitizeProduct } from '../shared/sanitizeProduct';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { IProduct } from '../shared/interface';
import { productCacheService } from '../services/product-cache.service';
import { findProductById, findProductBySku, findProductBySlug } from '../shared/queries';

const updateProductSchema = z.object({
    slug: z.string().min(1).optional(),
    product_title: z.string().min(1).optional(),
    secondary_title: z.string().optional().nullable(),

    short_description: z.string().optional().nullable(),
    full_description: z.string().optional().nullable(),

    status: z.enum(['draft', 'active', 'archived', 'schedule']).optional(),
    scheduled_publish_at: z.string().datetime().optional().nullable(),
    is_delisted: z.boolean().optional(),
    delist_date: z.string().datetime().optional().nullable(),
    sales_channels: z.array(z.string()).optional(),

    cost_price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost price format').optional(),
    selling_price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid selling price format').optional(),
    compare_at_price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid compare price format').optional().nullable(),

    sku: z.string().min(1).optional(),
    barcode: z.string().optional().nullable(),
    hsn_code: z.string().optional().nullable(),

    weight: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid weight format').optional().nullable(),
    length: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid length format').optional().nullable(),
    breadth: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid breadth format').optional().nullable(),
    height: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid height format').optional().nullable(),
    pickup_location: z.string().optional().nullable(),

    category_tier_1: z.string().optional().nullable(),
    category_tier_2: z.string().optional().nullable(),
    category_tier_3: z.string().optional().nullable(),
    category_tier_4: z.string().optional().nullable(),

    size_group: z.string().optional().nullable(),
    accessories_group: z.string().optional().nullable(),

    primary_image_url: z.string().url().optional().nullable(),
    additional_images: z.array(z.string().url()).optional(),

    meta_title: z.string().optional().nullable(),
    meta_description: z.string().optional().nullable(),

    is_limited_edition: z.boolean().optional(),
    is_preorder_enabled: z.boolean().optional(),
    preorder_release_date: z.string().datetime().optional().nullable(),
    is_gift_wrap_available: z.boolean().optional(),
});

type UpdateProduct = z.infer<typeof updateProductSchema>;

async function updateProduct(id: string, data: UpdateProduct, updatedBy: number): Promise<IProduct> {
    const existingProduct = await findProductById(id);

    if (!existingProduct) {
        throw new HttpException(404, 'Product not found');
    }

    // Check SKU uniqueness if changed
    if (data.sku && data.sku !== existingProduct.sku) {
        const existingProductWithSku = await findProductBySku(data.sku);
        if (existingProductWithSku && existingProductWithSku.id !== id) {
            throw new HttpException(409, 'Product with this SKU already exists');
        }
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existingProduct.slug) {
        const existingProductWithSlug = await findProductBySlug(data.slug);
        if (existingProductWithSlug && existingProductWithSlug.id !== id) {
            throw new HttpException(409, 'Product with this slug already exists');
        }
    }

    // Convert datetime strings to Date objects
    const updateData: any = {
        ...data,
        updated_by: updatedBy,
    };

    if (data.scheduled_publish_at !== undefined) {
        updateData.scheduled_publish_at = data.scheduled_publish_at ? new Date(data.scheduled_publish_at) : null;
    }
    if (data.delist_date !== undefined) {
        updateData.delist_date = data.delist_date ? new Date(data.delist_date) : null;
    }
    if (data.preorder_release_date !== undefined) {
        updateData.preorder_release_date = data.preorder_release_date ? new Date(data.preorder_release_date) : null;
    }

    const [result] = await db
        .update(products)
        .set({
            ...updateData,
            updated_at: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

    if (!result) {
        throw new HttpException(500, 'Failed to update product');
    }

    return result as IProduct;
}

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'User authentication required');
    }

    const paramsSchema = z.object({
        id: z.string().uuid('Invalid product ID format'),
    });

    const { id } = paramsSchema.parse(req.params);
    const updateData: UpdateProduct = req.body;

    const product = await updateProduct(id, updateData, userId);

    // Invalidate cache for updated product
    await productCacheService.invalidateProduct(product.id, product.sku, product.slug);

    const productResponse = sanitizeProduct(product);

    ResponseFormatter.success(res, productResponse, 'Product updated successfully');
};

const router = Router();

const paramsSchema = z.object({
    id: z.string().uuid('Invalid product ID format'),
});

router.put(
    '/:id',
    requireAuth,
    requirePermission('products:update'),
    validationMiddleware(updateProductSchema),
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
