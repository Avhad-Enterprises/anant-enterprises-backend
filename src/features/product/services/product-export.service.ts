import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { products } from '../shared/products.schema';

/**
 * Options for building product export query
 */
export interface ProductExportQueryOptions {
  scope?: 'all' | 'selected';
  selectedIds?: string[];
  startDate?: Date;
  endDate?: Date;
  status?: string | string[];
  categoryId?: string | string[];
  search?: string;
}

/**
 * Options for formatting product export data
 */
export interface ProductExportDataOptions {
  selectedColumns: string[];
}

/**
 * Build query conditions for product export
 */
export function buildProductExportConditions(options: ProductExportQueryOptions) {
  const conditions = [];

  // 1. Scope (Selected IDs)
  if (options.scope === 'selected' && options.selectedIds?.length) {
    conditions.push(inArray(products.id, options.selectedIds));
  }

  // 2. Date range filter (created_at)
  if (options.startDate) {
    conditions.push(gte(products.created_at, options.startDate));
  }
  if (options.endDate) {
    // Set to end of day
    const endOfDay = new Date(options.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    conditions.push(lte(products.created_at, endOfDay));
  }

  // 3. Status filter
  if (options.status) {
    if (Array.isArray(options.status)) {
      if (options.status.length > 0) {
        conditions.push(inArray(products.status, options.status as any[]));
      }
    } else {
      conditions.push(eq(products.status, options.status as any));
    }
  }

  // 4. Category filter (check all tier levels)
  if (options.categoryId) {
    if (Array.isArray(options.categoryId)) {
      if (options.categoryId.length > 0) {
        const categoryConditions = options.categoryId.map(catId => 
          sql`(${products.category_tier_1} = ${catId} OR 
               ${products.category_tier_2} = ${catId} OR 
               ${products.category_tier_3} = ${catId} OR 
               ${products.category_tier_4} = ${catId})`
        );
        conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`);
      }
    } else {
      conditions.push(
        sql`(${products.category_tier_1} = ${options.categoryId} OR 
             ${products.category_tier_2} = ${options.categoryId} OR 
             ${products.category_tier_3} = ${options.categoryId} OR 
             ${products.category_tier_4} = ${options.categoryId})`
      );
    }
  }

  // 5. Search filter
  if (options.search) {
    conditions.push(
      sql`(${products.product_title} ILIKE ${`%${options.search}%`} OR ${products.sku} ILIKE ${`%${options.search}%`})`
    );
  }

  // Don't export deleted products
  conditions.push(eq(products.is_deleted, false));

  return conditions;
}

/**
 * Query products for export based on provided filters
 */
export async function queryProductsForExport(options: ProductExportQueryOptions) {
  const conditions = buildProductExportConditions(options);

  const query = db.select().from(products);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  return await query;
}

/**
 * Format product data for export
 * Handles special formatting for dates, booleans, arrays, and objects
 */
export function formatProductExportData(
  data: any[],
  options: ProductExportDataOptions
) {
  return data.map(product => {
    const filtered: any = {};
    
    options.selectedColumns.forEach(col => {
      if (col in product) {
        const value = product[col as keyof typeof product];
        
        // Format dates
        if (value instanceof Date) {
          filtered[col] = value.toISOString();
        }
        // Format booleans
        else if (typeof value === 'boolean') {
          if (col === 'featured') {
            filtered[col] = value ? 'Yes' : 'No';
          } else {
            filtered[col] = value ? 'True' : 'False';
          }
        }
        // Format JSON types
        else if (typeof value === 'object' && value !== null) {
          // Arrays (tags, images, etc.)
          if (Array.isArray(value)) {
            filtered[col] = value; // Keep as array, formatters will handle it
          } else {
            filtered[col] = JSON.stringify(value);
          }
        }
        else {
          filtered[col] = value;
        }
      }
    });
    
    return filtered;
  });
}

/**
 * Transform array fields to comma-separated strings for Excel export
 * Excel doesn't handle array types well, so we convert them to strings
 */
export function transformArraysForExcel(data: any[]) {
  return data.map(row => {
    const newRow: any = { ...row };
    for (const key in newRow) {
      if (Array.isArray(newRow[key])) {
        newRow[key] = newRow[key].join(', ');
      }
    }
    return newRow;
  });
}
