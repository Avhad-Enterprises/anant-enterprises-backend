/**
 * Common Validation Schemas
 *
 * Reusable Zod validation schemas for consistent API validation across the application.
 * Use these schemas to ensure uniform validation patterns and error messages.
 */

import { z } from 'zod';

// ============================================
// UUID VALIDATION
// ============================================

/**
 * Standard UUID validation schema
 * Use for all UUID parameters and fields
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Optional UUID schema (allows null/undefined)
 */
export const optionalUuidSchema = z.string().uuid('Invalid UUID format').optional();

/**
 * Nullable UUID schema
 */
export const nullableUuidSchema = z.string().uuid('Invalid UUID format').nullable();

// ============================================
// PAGINATION
// ============================================

/**
 * Standard pagination query parameters
 * Default: page=1, limit=20
 * Max limit: 100 items per page
 */
export const paginationSchema = z.object({
  page: z.preprocess(
    val => (val ? Number(val) : 1),
    z.number().int().min(1, 'Page must be at least 1')
  ),
  limit: z.preprocess(
    val => (val ? Number(val) : 20),
    z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must not exceed 100')
  ),
});

/**
 * Extended pagination with offset support
 */
export const offsetPaginationSchema = paginationSchema.extend({
  offset: z.preprocess(
    val => (val ? Number(val) : 0),
    z.number().int().min(0, 'Offset must be non-negative')
  ),
});

// ============================================
// SEARCH & FILTERING
// ============================================

/**
 * Standard search and sort parameters
 */
export const searchSchema = z.object({
  q: z.string().max(200, 'Search query too long').optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional().default('desc'),
});

/**
 * Combined search with pagination
 */
export const searchWithPaginationSchema = searchSchema.merge(paginationSchema);

// ============================================
// DECIMAL / MONEY VALIDATION
// ============================================

/**
 * Decimal validation for monetary values
 * Format: digits with optional 2 decimal places (e.g., "10", "10.5", "10.99")
 * Allows zero and positive values only
 */
export const decimalSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal with up to 2 decimal places')
  .refine(val => parseFloat(val) >= 0, 'Must be a non-negative value');

/**
 * Positive decimal (must be greater than 0)
 */
export const positiveDecimalSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal with up to 2 decimal places')
  .refine(val => parseFloat(val) > 0, 'Must be a positive value greater than 0');

/**
 * Optional decimal schema
 */
export const optionalDecimalSchema = decimalSchema.optional();

/**
 * Nullable decimal schema
 */
export const nullableDecimalSchema = decimalSchema.nullable();

/**
 * Percentage validation (0-100 with up to 2 decimal places)
 */
export const percentageSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid percentage with up to 2 decimal places')
  .refine(
    val => parseFloat(val) >= 0 && parseFloat(val) <= 100,
    'Percentage must be between 0 and 100'
  );

// ============================================
// DATE VALIDATION
// ============================================

/**
 * ISO 8601 date string validation
 */
export const dateStringSchema = z.string().datetime('Must be a valid ISO 8601 date string');

/**
 * Date range validation (start and end dates)
 */
export const dateRangeSchema = z
  .object({
    start_date: dateStringSchema.optional(),
    end_date: dateStringSchema.optional(),
  })
  .refine(
    data => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['end_date'],
    }
  );

// ============================================
// ARRAY VALIDATION
// ============================================

/**
 * Array size limits for common use cases
 */
export const ARRAY_LIMITS = {
  TAGS: 50,
  ITEMS: 100,
  IDS: 1000,
  IMAGES: 20,
  ATTACHMENTS: 10,
} as const;

/**
 * Array of UUIDs with size limit
 * @param maxLength Maximum number of items (default: 100)
 */
export const uuidArraySchema = (maxLength: number = ARRAY_LIMITS.IDS) =>
  z
    .array(uuidSchema)
    .max(maxLength, `Maximum ${maxLength} items allowed`)
    .min(1, 'At least one item is required');

/**
 * Optional array of UUIDs
 */
export const optionalUuidArraySchema = (maxLength: number = ARRAY_LIMITS.IDS) =>
  z.array(uuidSchema).max(maxLength, `Maximum ${maxLength} items allowed`).optional();

/**
 * Array of strings with size and length limits
 * @param maxItems Maximum number of items
 * @param maxItemLength Maximum length of each string item
 */
export const stringArraySchema = (maxItems: number = 50, maxItemLength: number = 100) =>
  z
    .array(z.string().max(maxItemLength, `Each item must be at most ${maxItemLength} characters`))
    .max(maxItems, `Maximum ${maxItems} items allowed`);

// ============================================
// JSONB SIZE VALIDATION
// ============================================

/**
 * JSONB size limits (in bytes)
 */
export const JSONB_LIMITS = {
  SMALL: 1024, // 1KB - for simple metadata
  MEDIUM: 10240, // 10KB - for customization data
  LARGE: 102400, // 100KB - for complex documents
} as const;

/**
 * Validates JSONB object size
 * @param maxSize Maximum size in bytes (default: 10KB)
 */
export const jsonbSizeValidator = (maxSize: number = JSONB_LIMITS.MEDIUM) =>
  z.any().refine(
    val => {
      const size = JSON.stringify(val).length;
      return size <= maxSize;
    },
    {
      message: `Data too large (max ${maxSize} bytes)`,
    }
  );

// ============================================
// EMAIL & CONTACT VALIDATION
// ============================================

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email format').max(255, 'Email too long');

/**
 * Phone number validation (flexible format)
 */
export const phoneSchema = z
  .string()
  .regex(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
    'Invalid phone number format'
  )
  .max(20, 'Phone number too long');

/**
 * Optional phone schema
 */
export const optionalPhoneSchema = phoneSchema.optional();

// ============================================
// TEXT VALIDATION
// ============================================

/**
 * Short text (e.g., names, titles)
 */
export const shortTextSchema = z.string().min(1, 'Required').max(255, 'Maximum 255 characters');

/**
 * Medium text (e.g., descriptions)
 */
export const mediumTextSchema = z.string().max(1000, 'Maximum 1000 characters');

/**
 * Long text (e.g., content, articles)
 */
export const longTextSchema = z.string().max(10000, 'Maximum 10000 characters');

/**
 * Slug validation (URL-friendly strings)
 */
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must contain only lowercase letters, numbers, and hyphens'
  )
  .min(1, 'Slug is required')
  .max(255, 'Slug too long');

// ============================================
// NUMERIC VALIDATION
// ============================================

/**
 * Positive integer validation
 */
export const positiveIntSchema = z
  .number()
  .int('Must be an integer')
  .positive('Must be a positive number');

/**
 * Non-negative integer (includes 0)
 */
export const nonNegativeIntSchema = z
  .number()
  .int('Must be an integer')
  .nonnegative('Must be non-negative');

/**
 * Quantity validation (1-10000)
 */
export const quantitySchema = z
  .number()
  .int('Quantity must be an integer')
  .min(1, 'Quantity must be at least 1')
  .max(10000, 'Quantity too large');

/**
 * Rating validation (1-5)
 */
export const ratingSchema = z
  .number()
  .int('Rating must be an integer')
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating must be at most 5');

// ============================================
// BOOLEAN VALIDATION
// ============================================

/**
 * String to boolean conversion
 * Accepts: "true", "false", "1", "0", "yes", "no"
 */
export const stringBooleanSchema = z.string().transform(val => {
  const lower = val.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return true;
  if (lower === 'false' || lower === '0' || lower === 'no') return false;
  throw new Error('Invalid boolean value');
});

// ============================================
// STATUS VALIDATION
// ============================================

/**
 * Active/Inactive status
 */
export const statusSchema = z.enum(['active', 'inactive']);

/**
 * Is deleted flag (string to boolean)
 */
export const isDeletedSchema = stringBooleanSchema.optional().transform(val => val ?? false);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Creates a schema for query parameter that's a comma-separated list of UUIDs
 * Example: "uuid1,uuid2,uuid3" -> ["uuid1", "uuid2", "uuid3"]
 */
export const commaSeparatedUuidsSchema = (maxItems: number = 100) =>
  z
    .string()
    .transform(val => val.split(',').filter(Boolean))
    .pipe(z.array(uuidSchema).max(maxItems, `Maximum ${maxItems} items allowed`));

/**
 * Creates a schema for query parameter that's a comma-separated list of strings
 */
export const commaSeparatedStringsSchema = (maxItems: number = 50) =>
  z
    .string()
    .transform(val => val.split(',').filter(Boolean))
    .pipe(z.array(z.string()).max(maxItems, `Maximum ${maxItems} items allowed`));

// ============================================
// EXPORT TYPES
// ============================================

export type Pagination = z.infer<typeof paginationSchema>;
export type SearchParams = z.infer<typeof searchSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
