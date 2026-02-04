/**
 * Base Schemas for Import/Export
 * 
 * Reusable Zod schemas for import/export request validation.
 */

import { z } from 'zod';

/**
 * Import mode enum
 */
export const importModeSchema = z.enum(['create', 'update', 'upsert']).default('create');

/**
 * Export format enum
 */
export const exportFormatSchema = z.enum(['csv', 'xlsx']);

/**
 * Export scope enum
 */
export const exportScopeSchema = z.enum(['all', 'selected']);

/**
 * Date range schema for filtering
 */
export const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  field: z.string().optional().default('created_at'),
});

/**
 * Base export request schema
 * 
 * Extend this schema with feature-specific filters:
 * 
 * @example
 * const productExportSchema = baseExportSchema.extend({
 *   filters: z.object({
 *     status: z.enum(['active', 'draft', 'archived']).optional(),
 *     categoryId: z.string().optional(),
 *   }).optional(),
 * });
 */
export const baseExportSchema = z.object({
  scope: exportScopeSchema,
  format: exportFormatSchema,
  selectedIds: z.array(z.string()).optional(),
  selectedColumns: z.array(z.string()).min(1, 'At least one column must be selected'),
  dateRange: dateRangeSchema.optional(),
});

/**
 * Create base import request schema
 * 
 * Use this factory to create import schemas with entity-specific validation:
 * 
 * @example
 * const productImportSchema = z.object({
 *   sku: z.string().min(1),
 *   name: z.string().min(1),
 *   price: z.number().min(0),
 * });
 * 
 * const importRequestSchema = createImportRequestSchema(productImportSchema, {
 *   maxRecords: 500
 * });
 */
export function createImportRequestSchema<T extends z.ZodTypeAny>(
  entitySchema: T,
  options: {
    minRecords?: number;
    maxRecords?: number;
  } = {}
) {
  const { minRecords = 1, maxRecords = 1000 } = options;

  return z.object({
    data: z.array(entitySchema).min(minRecords).max(maxRecords),
    mode: importModeSchema,
  });
}

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(1000).default(50),
});

/**
 * Sort schema
 */
export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('asc'),
});
