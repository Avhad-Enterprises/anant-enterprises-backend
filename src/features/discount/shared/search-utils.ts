/**
 * Discount Search Utilities
 * Provides fuzzy search capabilities using PostgreSQL pg_trgm extension
 */

import { sql, or, SQL } from 'drizzle-orm';
import { discounts } from './discount.schema';

/**
 * Build fuzzy + exact search conditions for discounts
 * Combines pg_trgm similarity with ILIKE for codes
 * 
 * @param searchQuery - The search term from the user
 * @returns SQL condition combining fuzzy title matching and exact code search
 * 
 * @example
 * const searchConditions = buildDiscountSearchConditions("Summr Sale");
 * // Will match "Summer Sale" (fuzzy) or code "SUMMER10" (exact/substring)
 */
export function buildDiscountSearchConditions(
  searchQuery: string
): SQL | undefined {
  const trimmedQuery = searchQuery.trim();
  const searchPattern = `%${trimmedQuery}%`;

  // Fuzzy matching on title (using pg_trgm similarity)
  // Threshold 0.15 = 15% similarity
  const fuzzyTitle = sql`similarity(${discounts.title}, ${trimmedQuery}) > 0.15`;

  // Exact/substring matching on discount codes (via subquery)
  // We keep codes as ILIKE because users usually type codes exactly or partially
  const codeMatch = sql`EXISTS (
    SELECT 1 FROM discount_codes dc 
    WHERE dc.discount_id = ${discounts.id} 
    AND dc.code ILIKE ${searchPattern}
  )`;

  // Combine: Fuzzy title OR exact code
  return or(fuzzyTitle, codeMatch);
}
