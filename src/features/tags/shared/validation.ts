/**
 * Tag Validation Schemas
 *
 * Centralized Zod validation schemas for tag operations.
 * Extracted from API handlers per architecture guidelines.
 */

import { z } from 'zod';

// ============================================
// TAG TYPE ENUM
// ============================================

export const tagTypeEnum = ['customer', 'product', 'blogs', 'order'] as const;

// ============================================
// BASE SCHEMAS
// ============================================

/**
 * Schema for creating a new tag
 */
export const createTagSchema = z.object({
    name: z
        .string()
        .min(1, 'Tag name is required')
        .max(255, 'Tag name must not exceed 255 characters')
        .trim()
        .transform(val => val.toLowerCase()),
    type: z
        .enum(tagTypeEnum)
        .default('product'),
    status: z
        .boolean()
        .optional()
        .default(true),
});

/**
 * Schema for updating a tag
 */
export const updateTagSchema = z.object({
    name: z
        .string()
        .min(1, 'Tag name is required')
        .max(255, 'Tag name must not exceed 255 characters')
        .trim()
        .transform(val => val.toLowerCase())
        .optional(),
    type: z
        .enum(tagTypeEnum)
        .optional(),
    status: z
        .boolean()
        .optional(),
});

/**
 * Schema for tag ID parameter
 */
export const tagIdParamSchema = z.object({
    id: z.string().uuid('Invalid tag ID format'),
});

/**
 * Schema for multiple tag IDs (bulk operations)
 */
export const tagIdsSchema = z.object({
    ids: z
        .array(z.string().uuid('Invalid tag ID format'))
        .min(1, 'At least one tag ID is required')
        .max(100, 'Cannot delete more than 100 tags at once'),
});

// ============================================
// QUERY SCHEMAS
// ============================================

/**
 * Schema for get tags query parameters
 */
export const getTagsQuerySchema = z.object({
    type: z
        .string()
        .optional()
        .transform(val => val ? val.split(',').filter(Boolean) : undefined),
    status: z
        .string()
        .optional()
        .transform(val => {
            if (!val) return undefined;
            const statusOptions = val.split(',').filter(Boolean);
            const statusValues: boolean[] = [];
            
            if (statusOptions.includes('active') || statusOptions.includes('true')) {
                statusValues.push(true);
            }
            if (statusOptions.includes('inactive') || statusOptions.includes('false')) {
                statusValues.push(false);
            }
            
            return statusValues.length > 0 ? statusValues : undefined;
        }),
    search: z
        .string()
        .optional(),
    usage: z
        .string()
        .optional()
        .transform(val => {
            if (!val) return 'all';
            if (val.includes('used') && val.includes('unused')) return 'all';
            if (val.includes('used')) return 'used';
            if (val.includes('unused')) return 'unused';
            return 'all';
        }),
    sort: z
        .enum([
            'newest',
            'oldest',
            'name_asc',
            'name_desc',
            'usage_high',
            'usage_low',
            'updated_desc',
            'updated_asc',
            'type_asc',
            'type_desc',
            'status_asc',
            'status_desc'
        ])
        .optional()
        .default('newest'),
    page: z
        .string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 1),
    limit: z
        .string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 10),
});

// ============================================
// IMPORT/EXPORT SCHEMAS
// ============================================

/**
 * Schema for a single tag import record
 */
export const tagImportSchema = z.object({
    name: z
        .string()
        .min(1, 'Tag name is required')
        .max(255, 'Tag name must not exceed 255 characters')
        .trim()
        .transform(val => val.toLowerCase()),
    type: z
        .enum(tagTypeEnum),
    status: z
        .boolean()
        .or(z.string().transform(val => val === 'true' || val === '1'))
        .optional()
        .default(true),
});

/**
 * Schema for bulk tag import request
 */
export const importTagsRequestSchema = z.object({
    data: z
        .array(tagImportSchema)
        .min(1, 'At least one tag is required')
        .max(1000, 'Cannot import more than 1000 tags at once'),
    mode: z
        .enum(['create', 'update', 'upsert'])
        .default('create'),
});

/**
 * Schema for tag export request
 */
export const exportTagsRequestSchema = z.object({
    format: z
        .enum(['csv', 'json'])
        .default('csv'),
    type: z
        .string()
        .optional(),
    status: z
        .string()
        .optional(),
    search: z
        .string()
        .optional(),
    usage: z
        .string()
        .optional(),
});

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate tag type
 */
export const isValidTagType = (type: string): type is typeof tagTypeEnum[number] => {
    return tagTypeEnum.includes(type as any);
};

/**
 * Validate tag name format
 */
export const isValidTagName = (name: string): boolean => {
    if (!name || typeof name !== 'string') return false;
    if (name.length === 0 || name.length > 255) return false;
    
    // Tag name should only contain alphanumeric, spaces, hyphens, and underscores
    const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
    return validPattern.test(name);
};

/**
 * Normalize tag name for consistency
 */
export const normalizeTagName = (name: string): string => {
    return name.trim().toLowerCase();
};

/**
 * Parse tag status from various formats
 */
export const parseTagStatus = (status: any): boolean => {
    if (typeof status === 'boolean') return status;
    if (typeof status === 'string') {
        return status === 'true' || status === '1' || status === 'active';
    }
    return true; // Default to active
};

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagImportInput = z.infer<typeof tagImportSchema>;
export type ImportTagsRequest = z.infer<typeof importTagsRequestSchema>;
export type GetTagsQuery = z.infer<typeof getTagsQuerySchema>;
export type ExportTagsRequest = z.infer<typeof exportTagsRequestSchema>;
export type TagIdParam = z.infer<typeof tagIdParamSchema>;
export type TagIdsInput = z.infer<typeof tagIdsSchema>;
