/**
 * POST /api/products/import
 * Import products from CSV/JSON data
 * 
 * Supports:
 * - Creation of new products
 * - Updating existing products (by SKU)
 * - Bulk operations with batch processing
 * 
 * Phase C Refactor: Uses common import-export utilities
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { ResponseFormatter } from '../../../utils';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { logger } from '../../../utils/logging/logger';
import {
  numberParser,
  nullableNumberParser,
  booleanParser,
  arrayParser,
  caseInsensitiveEnum,
  createImportRequestSchema,
  batchProcessImport,
  formatImportSummary,
} from '../../../utils/import-export';
import { importSingleProduct } from '../services/product-import.service';

// ============================================
// VALIDATION SCHEMA
// ============================================

/**
 * Product import row schema
 * Uses common validation helpers for flexible CSV/JSON parsing
 */
const productImportSchema = z.object({
  // Identity
  sku: z.string().min(1, 'SKU is required').trim(),
  product_title: z.string().min(1, 'Product title is required').trim(),
  slug: z.string().optional(),

  // Status
  status: caseInsensitiveEnum(['active', 'draft', 'archived'] as const).default('draft'),
  featured: booleanParser(z.boolean().default(false)),

  // Pricing (using common number parsers)
  selling_price: numberParser(z.number().min(0, 'Selling price must be positive')),
  cost_price: numberParser(z.number().min(0, 'Cost price is required')),
  compare_at_price: nullableNumberParser(z.number().min(0).optional().nullable()),

  // Dimensions (using nullable number parser)
  weight: nullableNumberParser(z.number().optional().nullable()),
  length: nullableNumberParser(z.number().optional().nullable()),
  breadth: nullableNumberParser(z.number().optional().nullable()),
  height: nullableNumberParser(z.number().optional().nullable()),

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

  // Tags (using array parser for CSV support)
  tags: arrayParser(/[;,]/).optional().default([]),

  // Images
  primary_image_url: z.string().url().optional().nullable(),
  additional_images: arrayParser(/[;,]/).optional().default([]),

  // Inventory
  inventory_quantity: numberParser(z.number().int().min(0, 'Inventory quantity must be >= 0')),

  // Category (lookup by name)
  category_name: z.string().optional().nullable(),
});

/**
 * Import request schema (using common factory)
 */
const importRequestSchema = createImportRequestSchema(productImportSchema, {
  minRecords: 1,
  maxRecords: 500, // Batch limit
});

type ProductImportRow = z.infer<typeof productImportSchema>;

// ============================================
// HANDLER
// ============================================

const handler = async (req: RequestWithUser, res: Response) => {
  const { data, mode } = importRequestSchema.parse(req.body);
  const userId = req.userId || '';

  logger.info(`Starting product import. Count: ${data.length}, Mode: ${mode}`);

  // Use common batch processor
  const result = await batchProcessImport<ProductImportRow>(
    data,
    (row, currentMode, index) => importSingleProduct(row, currentMode, userId),
    mode,
    {
      batchSize: 50, // Process 50 at a time
      onProgress: (processed, total) => {
        logger.info(`Product import progress: ${processed}/${total}`);
      },
    }
  );

  // Format response
  const summary = formatImportSummary(result);
  const status = result.failed === 0 ? 200 : 207; // 207 Multi-Status if partial success

  logger.info(`Product import completed. ${summary}`);

  return ResponseFormatter.success(
    res,
    {
      ...result,
      summary,
    },
    'Product import completed',
    status
  );
};

// ============================================
// ROUTER
// ============================================

const router = Router();
router.post('/import', requireAuth, requirePermission('products:create'), handler);

export default router;
