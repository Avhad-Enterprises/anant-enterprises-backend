/**
 * Collection Rules Schema
 *
 * Defines the rules for automated collections.
 * NOTE: This table has been removed as automated collections are not implemented (31 Jan 2026)
 */

// import { pgTable, uuid, varchar, text, index } from 'drizzle-orm/pg-core';
// import { sql } from 'drizzle-orm';
// import { collections } from './collection.schema';

// ============================================
// COLLECTION RULES TABLE - REMOVED (31 Jan 2026)
// ============================================

// export const collectionRules = pgTable(
//   'collection_rules',
//   {
//     id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

//     // Parent Link
//     collection_id: uuid('collection_id')
//       .references(() => collections.id, { onDelete: 'cascade' })
//       .notNull(),

//     // Rule Logic
//     field: varchar('field', { length: 50 }).notNull(), // e.g. 'title', 'price', 'tag', 'vendor'
//     operator: varchar('operator', { length: 50 }).notNull(), // e.g. 'equals', 'starts_with', 'greater_than'
//     value: text('value').notNull(),
//   },
//   table => ({
//     // Lookup rules by collection
//     collectionIdIdx: index('collection_rules_collection_id_idx').on(table.collection_id),
//   })
// );

// Types
// export type CollectionRule = typeof collectionRules.$inferSelect; // REMOVED (31 Jan 2026)
// export type NewCollectionRule = typeof collectionRules.$inferInsert; // REMOVED (31 Jan 2026)
