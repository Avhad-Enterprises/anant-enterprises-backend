/**
 * Product Validation Schemas
 *
 * Complex Zod schemas (50+ lines) for product validation.
 * Extracted from API files per architecture guidelines.
 */

import { z } from 'zod';
import { decimalSchema, slugSchema, shortTextSchema } from '../../../utils';

// ============================================
// CREATE PRODUCT SCHEMA
// ============================================

export const createProductSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  product_title: z.string().min(1, 'Product title is required'),
  secondary_title: z.string().optional(),

  short_description: z.string().optional(),
  full_description: z.string().optional(),

  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  featured: z.boolean().default(false),

  cost_price: decimalSchema.default('0.00'),
  selling_price: decimalSchema,
  compare_at_price: decimalSchema.optional().nullable(),

  sku: z.string().min(1, 'SKU is required'),
  hsn_code: z.string().optional().nullable(),

  weight: decimalSchema.optional().nullable(),
  length: decimalSchema.optional().nullable(),
  breadth: decimalSchema.optional().nullable(),
  height: decimalSchema.optional().nullable(),

  category_tier_1: z.string().optional().nullable(),
  category_tier_2: z.string().optional().nullable(),
  category_tier_3: z.string().optional().nullable(),
  category_tier_4: z.string().optional().nullable(),

  primary_image_url: z.string().url().optional().nullable(),
  additional_images: z.array(z.string().url()).default([]),

  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  product_url: z.string().optional().nullable(),

  tags: z.array(z.string()).optional().default([]),

  // FAQs - array of question/answer pairs
  faqs: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required'),
  })).optional().default([]),

  // Inventory - initial stock quantity (only used for products without variants)
  inventory_quantity: z.number().int().nonnegative().optional().default(0),

  // Variants support
  has_variants: z.boolean().default(false),
  variants: z.array(z.object({
    option_name: z.string().default('Default'),
    option_value: z.string().default('Standard'),
    sku: z.string().min(1, 'Variant SKU is required'),
    barcode: z.string().optional().nullable(),
    cost_price: decimalSchema.default('0.00'),
    selling_price: decimalSchema,
    compare_at_price: decimalSchema.optional().nullable(),
    inventory_quantity: z.number().int().nonnegative().default(0),
    image_url: z.string().url().optional().nullable(),
    thumbnail_url: z.string().url().optional().nullable(),
  })).optional().default([]),
}).refine((data) => {
  if (data.compare_at_price && data.selling_price) {
    const compareAt = parseFloat(data.compare_at_price);
    const selling = parseFloat(data.selling_price);
    return compareAt >= selling;
  }
  return true;
}, {
  message: "Compare at price must be greater than or equal to selling price",
  path: ["compare_at_price"],
}).refine((data) => {
  // If has_variants is true, must have at least one variant
  if (data.has_variants && (!data.variants || data.variants.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Products with variants must have at least one variant defined",
  path: ["variants"],
}).refine((data) => {
  // Variant SKUs must be unique within the product
  if (data.variants && data.variants.length > 0) {
    const skus = data.variants.map(v => v.sku);
    const uniqueSkus = new Set(skus);
    return skus.length === uniqueSkus.size;
  }
  return true;
}, {
  message: "Variant SKUs must be unique",
  path: ["variants"],
}).refine((data) => {
  // Validate variant pricing: Compare At >= Selling
  if (data.variants && data.variants.length > 0) {
    for (const variant of data.variants) {
      if (variant.compare_at_price && variant.selling_price) {
        const compareAt = parseFloat(variant.compare_at_price);
        const selling = parseFloat(variant.selling_price);
        // Skip if invalid numbers (Zod handles type validation elsewhere)
        if (isNaN(compareAt) || isNaN(selling)) continue;

        if (compareAt < selling) {
          return false;
        }
      }
    }
  }
  return true;
}, {
  message: "Variant 'Compare at price' must be greater than or equal to 'Selling price'",
  path: ["variants"],
});

// ============================================
// UPDATE PRODUCT SCHEMA
// ============================================

export const updateProductSchema = z.object({
  slug: slugSchema.optional(),
  product_title: shortTextSchema.optional(),
  secondary_title: z.string().optional().nullable(),

  short_description: z.string().optional().nullable(),
  full_description: z.string().optional().nullable(),

  status: z.enum(['draft', 'active', 'archived']).optional(),
  featured: z.boolean().optional(),

  cost_price: decimalSchema.optional(),
  selling_price: decimalSchema.optional(),
  compare_at_price: decimalSchema.optional().nullable(),

  sku: shortTextSchema.optional(),
  hsn_code: z.string().optional().nullable(),

  // Inventory - coerced to number to handle string inputs
  inventory_quantity: z.coerce.number().int().nonnegative().optional(),

  weight: decimalSchema.optional().nullable(),
  length: decimalSchema.optional().nullable(),
  breadth: decimalSchema.optional().nullable(),
  height: decimalSchema.optional().nullable(),

  category_tier_1: z.string().optional().nullable(),
  category_tier_2: z.string().optional().nullable(),
  category_tier_3: z.string().optional().nullable(),
  category_tier_4: z.string().optional().nullable(),

  primary_image_url: z.string().url().optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  additional_images: z.array(z.string().url()).optional(),
  additional_thumbnails: z.array(z.union([z.string().url(), z.literal('')])).optional(),

  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  product_url: z.string().optional().nullable(),

  tags: z.array(z.string()).optional(),

  // FAQs - array of question/answer pairs
  faqs: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required'),
  })).optional(),

  // Variants support
  has_variants: z.boolean().optional(),
  variants: z.array(z.object({
    id: z.string().uuid().optional(), // Existing variant ID for updates
    option_name: z.string().min(1, 'Variant name is required'),
    option_value: z.string().min(1, 'Variant value is required'),
    sku: z.string().min(1, 'Variant SKU is required'),
    barcode: z.string().optional().nullable(),
    cost_price: decimalSchema.default('0.00'),
    selling_price: decimalSchema,
    compare_at_price: decimalSchema.optional().nullable(),
    inventory_quantity: z.number().int().nonnegative().default(0),
    image_url: z.string().url().optional().nullable(),
    thumbnail_url: z.string().url().optional().nullable(),
    is_active: z.boolean().optional().default(true),
  })).optional(),
});
