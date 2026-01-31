/**
 * POST /api/products/import
 * Import products from CSV/JSON data
 * 
 * Supports:
 * - Creation of new products
 * - Updating existing products (by SKU)
 * - Bulk operations
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { logger } from '../../../utils/logging/logger';
import { updateTagUsage } from '../../tags/services/tag-sync.service';
import { findProductBySku } from '../shared/queries';
import { createInventoryForProduct } from '../../inventory/services/inventory.service';
import { inventory } from '../../inventory/shared/inventory.schema';
import { inventoryAdjustments } from '../../inventory/shared/inventory-adjustments.schema';
import { tiers } from '../../tiers/shared/tiers.schema';

// Schema for individual product row validation
// Note: We use z.preprocess to handle string-encoded numbers often found in CSV imports
const productImportSchema = z.object({
    // Identity
    sku: z.string().min(1, 'SKU is required'),
    product_title: z.string().min(1, 'Product title is required'),
    slug: z.string().optional(), // Auto-generate if missing
    
    // Status
    status: z.enum(['active', 'draft', 'archived']).optional().default('draft'),
    featured: z.preprocess(
        (val) => val === 'true' || val === true || val === '1' || val === 1,
        z.boolean().optional().default(false)
    ),

    // Pricing
    selling_price: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const trimmed = val.trim();
                return trimmed === '' ? undefined : parseFloat(trimmed);
            }
            return val;
        },
        z.number().min(0, 'Selling price must be positive')
    ),
    cost_price: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const trimmed = val.trim();
                return trimmed === '' ? undefined : parseFloat(trimmed);
            }
            return val;
        },
        z.number().min(0, 'Cost price is required')
    ),
    compare_at_price: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const trimmed = val.trim();
                if (trimmed === '') return null;
                const num = parseFloat(trimmed);
                return isNaN(num) ? null : num;
            }
            return val;
        },
        z.number().min(0).optional().nullable()
    ),

    // Dimensions
    weight: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const trimmed = val.trim();
                if (trimmed === '') return null;
                const num = parseFloat(trimmed);
                return isNaN(num) ? null : num;
            }
            return val;
        },
        z.number().optional().nullable()
    ),
    length: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const trimmed = val.trim();
                if (trimmed === '') return null;
                const num = parseFloat(trimmed);
                return isNaN(num) ? null : num;
            }
            return val;
        },
        z.number().optional().nullable()
    ),
    breadth: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const trimmed = val.trim();
                if (trimmed === '') return null;
                const num = parseFloat(trimmed);
                return isNaN(num) ? null : num;
            }
            return val;
        },
        z.number().optional().nullable()
    ),
    height: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const trimmed = val.trim();
                if (trimmed === '') return null;
                const num = parseFloat(trimmed);
                return isNaN(num) ? null : num;
            }
            return val;
        },
        z.number().optional().nullable()
    ),

    // Logistics
    hsn_code: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),

    // Content
    short_description: z.string().optional().nullable(),
    full_description: z.string().optional().nullable(),

    // Meta
    meta_title: z.string().optional().nullable(),
    meta_description: z.string().optional().nullable(),
    product_url: z.string().optional().nullable(),

    // Tags (can be array or string in CSV)
    tags: z.union([z.string(), z.array(z.string())]).optional().transform(val => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        // Split by comma or semicolon
        return val.split(/[;,]+/).map(t => t.trim()).filter(Boolean);
    }),

    // Images (array or string)
    primary_image_url: z.string().optional().nullable(),
    additional_images: z.union([z.string(), z.array(z.string())]).optional().transform(val => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return val.split(/[;,]+/).map(t => t.trim()).filter(Boolean);
    }),

    // Inventory
    inventory_quantity: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const trimmed = val.trim();
                return trimmed === '' ? undefined : parseInt(trimmed, 10);
            }
            return val;
        },
        z.number().int().min(0, 'Inventory quantity is required')
    ),
    
    // Category (Optional - lookup by name)
    category_name: z.string().optional().nullable(),
});

const importRequestSchema = z.object({
    data: z.array(productImportSchema).min(1).max(500), // Limit batch size
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});

type ImportMode = 'create' | 'update' | 'upsert';
type ImportResult = {
    success: number;
    failed: number;
    skipped: number;
    errors: Array<{ row: number; sku: string; error: string }>;
};

/**
 * Helper to generate slug from title
 */
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() + '-' + Math.random().toString(36).substring(2, 6); // Add random suffix to ensure uniqueness in bulk
}

async function importProduct(
    rawData: z.infer<typeof productImportSchema>,
    mode: ImportMode,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const normalizedSku = rawData.sku.trim();
        
        // Check existing
        const existing = await db
            .select()
            .from(products)
            .where(eq(products.sku, normalizedSku))
            .limit(1);
        
        const exists = existing.length > 0;
        const currentProduct = exists ? existing[0] : null;

        // Determine action
        if (mode === 'create' && exists) {
            return { success: false, error: 'Product already exists (SKU conflict)' };
        }
        if (mode === 'update' && !exists) {
            return { success: false, error: 'Product SKU does not exist' };
        }

        if (mode === 'update' && !exists) {
            return { success: false, error: 'Product SKU does not exist' };
        }

        const shouldLinkTags = rawData.tags && rawData.tags.length > 0;

        // Resolve Category if provided
        let categoryId: string | null = null;
        if (rawData.category_name && rawData.category_name.trim()) {
            const [cat] = await db
                .select({ id: tiers.id })
                .from(tiers)
                .where(and(
                     eq(tiers.name, rawData.category_name.trim()),
                     eq(tiers.level, 1) // Only Tier 1 supported for now
                ))
                .limit(1);
            
            if (cat) {
                 categoryId = cat.id;
            } else {
                 // Fail strict validation if category provided but not found
                 return { success: false, error: `Category '${rawData.category_name}' not found` };
            }
        }


        // Prepare payload
        const payload: any = {
            sku: normalizedSku,
            product_title: rawData.product_title,
            slug: rawData.slug || (exists ? undefined : generateSlug(rawData.product_title)), // Don't change slug on update unless specified?
            
            // Prices - ensure string for decimal
            selling_price: String(rawData.selling_price),
            cost_price: String(rawData.cost_price),
            compare_at_price: rawData.compare_at_price ? String(rawData.compare_at_price) : null,
            
            // Category
            category_tier_1: categoryId,

            // Status
            status: rawData.status,
            featured: rawData.featured,

            // Dimensions
            weight: rawData.weight ? String(rawData.weight) : null,
            length: rawData.length ? String(rawData.length) : null,
            breadth: rawData.breadth ? String(rawData.breadth) : null,
            height: rawData.height ? String(rawData.height) : null,

            // Logistics
            hsn_code: rawData.hsn_code,
            barcode: rawData.barcode,

            // Content
            short_description: rawData.short_description,
            full_description: rawData.full_description,
            
            // Meta
            meta_title: rawData.meta_title,
            meta_description: rawData.meta_description,
            product_url: rawData.product_url,

            // Images
            primary_image_url: rawData.primary_image_url,
            additional_images: rawData.additional_images,

            // Tags
            tags: rawData.tags,

            // Audit
            updated_at: new Date(),
            updated_by: userId,
        };

        if (!exists) {
            // New Record fields
            payload.created_by = userId;
            
            // Insert
            await db.insert(products).values(payload);

            // Sync tags
            if (shouldLinkTags) {
                await updateTagUsage([], rawData.tags, 'product');
            }
        } else {
            // Update
            const oldTags = (currentProduct?.tags as string[]) || [];

            await db.update(products).set(payload).where(eq(products.sku, normalizedSku));

            // Sync tags (diff)
            if (shouldLinkTags || oldTags.length > 0) {
                await updateTagUsage(oldTags, rawData.tags || [], 'product');
            }
        }
        
        // ============================================
        // INVENTORY HANDLING
        // ============================================
        if (rawData.inventory_quantity !== undefined && rawData.inventory_quantity !== null) {
            const targetProductId = exists ? currentProduct!.id : (await findProductBySku(normalizedSku))?.id;
            
            if (targetProductId) {
                // Check for existing inventory
                const [existingInv] = await db
                    .select()
                    .from(inventory)
                    .where(eq(inventory.product_id, targetProductId))
                    .limit(1);

                if (!existingInv) {
                    // Create new inventory record
                    await createInventoryForProduct(
                        targetProductId,
                        rawData.inventory_quantity,
                        userId
                    );
                } else {
                    // Update existing inventory (Correction)
                    const newQty = rawData.inventory_quantity;
                    const oldQty = existingInv.available_quantity;
                    
                    if (newQty !== oldQty) {
                        const diff = newQty - oldQty;
                        
                        // Update inventory
                        await db.update(inventory)
                            .set({
                                available_quantity: newQty,
                                updated_at: new Date(),
                                updated_by: userId ? userId : undefined // Use undefined if empty string, though resolvedValidUserId handles it deeper usually. Here we trust auth middleware
                            })
                            .where(eq(inventory.id, existingInv.id));

                        // Log adjustment if we have a valid user ID (admin)
                         if (userId && userId.length > 0) {
                             // Try to resolve a valid UUID for the adjustment
                             // For simplicity in this import script, we'll try to use the passed userId if valid, 
                             // otherwise we might skip the audit log or need to fetch a system user. 
                             // Since createInventoryForProduct does it, let's just do a basic insert if possible.
                             try {
                                 await db.insert(inventoryAdjustments).values({
                                     inventory_id: existingInv.id,
                                     adjustment_type: 'correction',
                                     quantity_change: diff,
                                     reason: 'Product Import Update',
                                     quantity_before: oldQty,
                                     quantity_after: newQty,
                                     adjusted_by: userId, // Assuming valid UUID from auth middleware
                                     notes: `Imported via CSV. Mode: ${mode}`
                                 });
                             } catch (adjErr) {
                                 logger.warn('Failed to create inventory adjustment log during import', { error: adjErr });
                             }
                         }
                    }
                }
            }
        }
        
        return { success: true };

    } catch (error: any) {
        logger.error('Product Import Error', { sku: rawData.sku, error });
        return { success: false, error: error.message || 'Database error' };
    }
}

const handler = async (req: RequestWithUser, res: Response) => {
    // 1. Validate Structure
    const validation = importRequestSchema.safeParse(req.body);
    if (!validation.success) {
        console.error('Import Validation Failed:', JSON.stringify(validation.error.issues, null, 2));
        throw new HttpException(400, 'Invalid import data', { details: validation.error.issues });
    }

    const { data, mode } = validation.data;
    const userId = req.userId || '';

    logger.info(`Starting product import. Count: ${data.length}, Mode: ${mode}`);

    const result: ImportResult = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };

    // 2. Process
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const res = await importProduct(row, mode, userId);

        if (res.success) {
            result.success++;
        } else {
            if (res.error?.includes('already exists')) {
                result.skipped++;
            } else {
                result.failed++;
            }
            result.errors.push({
                row: i + 1,
                sku: row.sku,
                error: res.error || 'Unknown'
            });
        }
    }

    // 3. Response
    const status = result.failed === 0 ? 200 : 207;
    return ResponseFormatter.success(res, result, 'Product import completed', status);
};

const router = Router();
router.post('/import', requireAuth, requirePermission('products:create'), handler);

export default router;
