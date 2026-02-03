/**
 * Validation Helpers for Import/Export
 * 
 * Reusable Zod preprocessors for common CSV/JSON import validation patterns.
 * Handles string-to-type conversions, flexible formats, and edge cases.
 */

import { z } from 'zod';

/**
 * Parse string to number with flexible handling
 * 
 * Handles:
 * - String numbers with commas: "1,234.56" → 1234.56
 * - Empty strings: "" → undefined
 * - Whitespace: "  123  " → 123
 * - Already numbers: 123 → 123
 * 
 * @example
 * const schema = z.object({
 *   price: numberParser(z.number().min(0, 'Price must be positive'))
 * });
 */
export function numberParser<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return undefined;
      // Remove commas and parse
      const cleaned = trimmed.replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : parsed;
    }
    return val;
  }, schema);
}

/**
 * Parse string to nullable number (for optional fields)
 * 
 * @example
 * const schema = z.object({
 *   comparePrice: nullableNumberParser(z.number().min(0).optional().nullable())
 * });
 */
export function nullableNumberParser<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;
      const cleaned = trimmed.replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return val;
  }, schema);
}

/**
 * Parse string to boolean with flexible input
 * 
 * Accepts:
 * - Boolean: true/false
 * - String: "true"/"false", "yes"/"no", "1"/"0", "active"/"inactive"
 * - Number: 1/0
 * 
 * @example
 * const schema = z.object({
 *   featured: booleanParser(z.boolean().default(false))
 * });
 */
export function booleanParser<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      if (lower === 'true' || lower === 'yes' || lower === '1' || lower === 'active') {
        return true;
      }
      if (lower === 'false' || lower === 'no' || lower === '0' || lower === 'inactive') {
        return false;
      }
    }
    return val;
  }, schema);
}

/**
 * Parse date with flexible formats
 * 
 * Accepts:
 * - ISO format: "2026-02-02"
 * - DD/MM/YYYY: "02/02/2026"
 * - DD-MM-YYYY: "02-02-2026"
 * - Any valid Date.parse() format
 * 
 * @param returnFormat - 'iso' | 'date' (default: 'iso' returns YYYY-MM-DD string)
 * 
 * @example
 * const schema = z.object({
 *   birthDate: dateParser('iso').pipe(z.string().optional())
 * });
 */
export function dateParser(returnFormat: 'iso' | 'date' = 'iso') {
  return z.preprocess((val) => {
    if (!val) return undefined;
    if (val instanceof Date) {
      return returnFormat === 'iso' ? val.toISOString().split('T')[0] : val;
    }
    if (typeof val !== 'string') return undefined;

    const cleanVal = val.trim();
    if (!cleanVal) return undefined;

    // Try ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanVal)) {
      return returnFormat === 'iso' ? cleanVal : new Date(cleanVal);
    }

    // Try DD/MM/YYYY or DD-MM-YYYY
    const match = cleanVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) {
      const [_, day, month, year] = match;
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      return returnFormat === 'iso' ? isoDate : new Date(isoDate);
    }

    // Try Date.parse as fallback
    const timestamp = Date.parse(cleanVal);
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp);
      return returnFormat === 'iso' ? date.toISOString().split('T')[0] : date;
    }

    return undefined;
  }, z.union([z.string(), z.date()]));
}

/**
 * Case-insensitive enum parser
 * 
 * Matches enum values regardless of case
 * 
 * @example
 * const statusEnum = caseInsensitiveEnum(['active', 'draft', 'archived']);
 * // Accepts: "ACTIVE", "Active", "active" → 'active'
 */
export function caseInsensitiveEnum<T extends string>(values: readonly T[]) {
  return z.preprocess((val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return undefined;
      const lower = trimmed.toLowerCase();
      const match = values.find(v => v.toLowerCase() === lower);
      return match || val;
    }
    return val;
  }, z.enum(values as [T, ...T[]]).optional());
}

/**
 * Parse CSV string or array to array
 * 
 * Accepts:
 * - Array: ['tag1', 'tag2']
 * - String: "tag1, tag2, tag3"
 * - String with custom separator: "tag1; tag2"
 * 
 * @param separator - Separator for string parsing (default: ',')
 * 
 * @example
 * const schema = z.object({
 *   tags: arrayParser().pipe(z.array(z.string()).optional())
 * });
 */
export function arrayParser(separator: string | RegExp = ',') {
  return z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return [];
      return trimmed
        .split(separator)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
    return val;
  }, z.array(z.string()));
}

/**
 * Parse string to JSON object
 * 
 * @example
 * const schema = z.object({
 *   metadata: jsonParser().pipe(z.record(z.any()).optional())
 * });
 */
export function jsonParser() {
  return z.preprocess((val) => {
    if (typeof val === 'object') return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return undefined;
      try {
        return JSON.parse(trimmed);
      } catch {
        return undefined;
      }
    }
    return val;
  }, z.union([z.record(z.string(), z.any()), z.array(z.any())]));
}

/**
 * Trim string whitespace
 * 
 * @example
 * const schema = z.object({
 *   name: trimString(z.string().min(1, 'Name required'))
 * });
 */
export function trimString<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (typeof val === 'string') {
      return val.trim();
    }
    return val;
  }, schema);
}

/**
 * Parse empty string to null
 * 
 * Useful for optional nullable fields
 * 
 * @example
 * const schema = z.object({
 *   notes: emptyStringToNull(z.string().nullable().optional())
 * });
 */
export function emptyStringToNull<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') {
      return null;
    }
    return val;
  }, schema);
}

/**
 * Combined preprocessor: trim + empty to null
 * 
 * @example
 * const schema = z.object({
 *   description: trimAndNullify(z.string().nullable().optional())
 * });
 */
export function trimAndNullify<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    }
    return val;
  }, schema);
}

/**
 * Percentage string parser
 * 
 * Converts "50%" or "50" to 50 (number)
 * 
 * @example
 * const schema = z.object({
 *   discount: percentageParser(z.number().min(0).max(100))
 * });
 */
export function percentageParser<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const trimmed = val.trim().replace('%', '');
      const parsed = parseFloat(trimmed);
      return isNaN(parsed) ? undefined : parsed;
    }
    return val;
  }, schema);
}
