/**
 * Tier Validation Schemas
 *
 * Complex Zod schemas for tier validation.
 * Extracted from API files per architecture guidelines.
 */

import { z } from 'zod';

// ============================================
// CONSTANTS
// ============================================

export const MAX_TIER_LEVELS = 4;
export const MIN_TIER_LEVEL = 1;

// ============================================
// TIER STATUS ENUM
// ============================================

export const tierStatusValues = ['active', 'inactive'] as const;
export type TierStatus = typeof tierStatusValues[number];

// ============================================
// TIER CODE VALIDATION
// ============================================

/**
 * Tier code must be URL-friendly
 * Lowercase alphanumeric with hyphens only
 */
export const tierCodeSchema = z
    .string()
    .min(1, 'Code is required')
    .max(255, 'Code must be 255 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Code must be lowercase alphanumeric with hyphens only')
    .trim();

// ============================================
// CREATE TIER SCHEMA
// ============================================

/**
 * Schema for creating a new tier
 * Used in: create-tier.ts
 */
export const createTierSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long').trim(),
    code: tierCodeSchema.optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    level: z.number().int().min(MIN_TIER_LEVEL).max(MAX_TIER_LEVELS),
    parent_id: z.string().uuid('Invalid parent ID').optional(),
    priority: z.number().int().nonnegative().optional().default(0),
    status: z.enum(tierStatusValues).default('active'),
});

export type CreateTierInput = z.infer<typeof createTierSchema>;

// ============================================
// UPDATE TIER SCHEMA
// ============================================

/**
 * Schema for updating an existing tier
 * Used in: update-tier.ts
 * Note: Cannot change level or parent_id to maintain hierarchy integrity
 */
export const updateTierSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long').trim().optional(),
    code: tierCodeSchema.optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    priority: z.number().int().nonnegative().optional(),
    status: z.enum(tierStatusValues).optional(),
});

export type UpdateTierInput = z.infer<typeof updateTierSchema>;

// ============================================
// TIER IMPORT SCHEMA
// ============================================

/**
 * Schema for importing tiers from CSV
 * Used in: import-tiers.ts
 * Uses parent_code instead of parent_id for easier CSV imports
 */
export const tierImportSchema = z.object({
    name: z.string().min(1).max(255).trim(),
    code: z.string().min(1).max(255).trim().optional(),
    description: z.string().optional(),
    level: z.number().int().min(MIN_TIER_LEVEL).max(MAX_TIER_LEVELS),
    parent_code: z.string().optional(), // Use parent code instead of ID for CSV import
    priority: z.number().int().nonnegative().optional(),
    status: z.enum(tierStatusValues).optional(),
});

export type TierImportInput = z.infer<typeof tierImportSchema>;

/**
 * Import request schema with mode
 */
export const importTiersRequestSchema = z.object({
    data: z.array(tierImportSchema).min(1, 'Must provide at least one tier').max(1000, 'Maximum 1000 tiers per import'),
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});

export type ImportTiersRequest = z.infer<typeof importTiersRequestSchema>;

// ============================================
// PARAMETER SCHEMAS
// ============================================

/**
 * UUID parameter validation
 */
export const tierIdParamSchema = z.object({
    id: z.string().uuid('Invalid tier ID'),
});

export type TierIdParam = z.infer<typeof tierIdParamSchema>;

// ============================================
// QUERY SCHEMAS
// ============================================

/**
 * Get tiers query parameters
 */
export const getTiersQuerySchema = z.object({
    level: z.coerce.number().int().min(MIN_TIER_LEVEL).max(MAX_TIER_LEVELS).optional(),
    parent_id: z.string().uuid().optional(),
    status: z.enum(tierStatusValues).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

export type GetTiersQuery = z.infer<typeof getTiersQuerySchema>;

// ============================================
// BULK DELETE SCHEMA
// ============================================

/**
 * Bulk delete tiers
 * Used in: bulk-delete-tiers.ts
 */
export const bulkDeleteTiersSchema = z.object({
    ids: z.array(z.string().uuid()).min(1, 'Must provide at least one tier ID'),
});

export type BulkDeleteTiersInput = z.infer<typeof bulkDeleteTiersSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate tier hierarchy
 * - Root tiers (level 1) must not have parent
 * - Child tiers must have parent
 * - Child level must be parent level + 1
 */
export const validateTierHierarchy = (
    level: number,
    parentLevel: number | null
): { valid: boolean; error?: string } => {
    // Root tier validation
    if (level === 1) {
        if (parentLevel !== null) {
            return { valid: false, error: 'Root tier (level 1) cannot have a parent' };
        }
        return { valid: true };
    }

    // Child tier validation
    if (parentLevel === null) {
        return { valid: false, error: `Level ${level} tier requires a parent` };
    }

    if (level !== parentLevel + 1) {
        return { 
            valid: false, 
            error: `Invalid level. Child tier must be level ${parentLevel + 1} (parent is level ${parentLevel})` 
        };
    }

    return { valid: true };
};

/**
 * Check if tier level is valid
 */
export const isValidTierLevel = (level: number): boolean => {
    return level >= MIN_TIER_LEVEL && level <= MAX_TIER_LEVELS;
};

/**
 * Check if tier status is valid
 */
export const isValidTierStatus = (status: string): status is TierStatus => {
    return tierStatusValues.includes(status as TierStatus);
};
