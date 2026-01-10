
import { sql, ilike, or, and, type SQL } from 'drizzle-orm';
import { products } from './product.schema';

/**
 * Splits a query string into formatted search terms.
 * Removes empty terms and duplicates.
 */
export function getSearchTerms(query: string): string[] {
    if (!query) return [];
    return query.trim().split(/\s+/).filter(t => t.length > 0);
}

/**
 * Builds the comprehensive search conditions for product search.
 * Includes exact matches, all-terms matches, and any-term matches.
 */
export function buildProductSearchConditions(query: string, terms: string[]) {
    const searchPattern = `%${query}%`;

    // 1. Exact phrase match (Highest priority logic often handled in ORDER BY, but good to include in OR)
    const exactMatch = or(
        ilike(products.product_title, searchPattern),
        ilike(products.sku, searchPattern)
    );

    // 2. All terms must be present (High priority)
    const allTermsMatch = terms.length > 0 ? and(
        ...terms.map(term =>
            or(
                ilike(products.product_title, `%${term}%`),
                ilike(products.secondary_title, `%${term}%`),
                ilike(products.category_tier_1, `%${term}%`),
                ilike(products.sku, `%${term}%`)
            )
        )
    ) : undefined;

    // 3. Any term matches (Fallback)
    const anyTermMatch = terms.length > 0 ? or(
        ...terms.map(term =>
            or(
                ilike(products.product_title, `%${term}%`),
                ilike(products.secondary_title, `%${term}%`),
                ilike(products.category_tier_1, `%${term}%`)
            )
        )
    ) : undefined;

    return { exactMatch, allTermsMatch, anyTermMatch, searchPattern };
}

/**
 * Calculates the relevance score for sorting.
 */
export function calculateRelevanceScore(searchPattern: string, terms: string[]): SQL<number> {
    if (terms.length === 0) {
        return sql<number>`
            CASE 
              WHEN ${products.product_title} ILIKE ${searchPattern} OR ${products.sku} ILIKE ${searchPattern} THEN 100
              ELSE 0
            END
        `;
    }

    return sql<number>`
        CASE 
          WHEN ${products.product_title} ILIKE ${searchPattern} OR ${products.sku} ILIKE ${searchPattern} THEN 100
          ELSE 0
        END +
        (
          ${sql.join(
        terms.map(term => sql`
              CASE WHEN ${products.product_title} ILIKE ${`%${term}%`} THEN 10 ELSE 0 END
            `),
        sql` + `
    )}
        )
    `;
}
