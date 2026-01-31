/**
 * Collection Shared Index
 *
 * Re-exports everything from the shared directory.
 */

// Schemas
export * from './collection.schema';
// export * from './collection-rules.schema'; // REMOVED - Unused table (31 Jan 2026)
export * from './collection-products.schema';

// Interfaces and types
export * from './interface';

// Database queries
export * from './queries';

// Sanitization utilities
export * from './sanitizeCollection';
