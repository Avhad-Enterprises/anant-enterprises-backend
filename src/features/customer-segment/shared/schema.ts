import {
  pgTable,
  serial,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Customer Segments Schema
 * Rule-based customer segmentation for targeted marketing & pricing
 */

// Enums
export const segmentTypeEnum = pgEnum('segment_type', ['manual', 'automated']);
export const segmentMatchTypeEnum = pgEnum('segment_match_type', ['all', 'any']);
export const segmentStatusEnum = pgEnum('segment_status', ['active', 'inactive']);

/**
 * Customer Segments Table
 * Define customer groups with rules
 */
export const customerSegments = pgTable(
  'customer_segments',
  {
    id: serial('id').primaryKey(),
    
    // Basic info
    name: varchar('name', { length: 180 }).notNull(),
    description: text('description'),
    type: segmentTypeEnum('type').notNull(),
    
    // Rules (for automated segments)
    rules: jsonb('rules'),
    match_type: segmentMatchTypeEnum('match_type').default('all'),
    
    // Status
    status: segmentStatusEnum('status').default('active').notNull(),
    
    // Statistics (cached)
    customer_count: integer('customer_count').default(0),
    last_calculated_at: timestamp('last_calculated_at'),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    typeIdx: index('customer_segments_type_idx').on(table.type),
    statusIdx: index('customer_segments_status_idx').on(table.status),
  })
);

/**
 * Customer Segment Users Junction Table
 * Links users to segments (for manual segments or cached automated membership)
 */
export const customerSegmentUsers = pgTable(
  'customer_segment_users',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    segment_id: integer('segment_id')
      .notNull()
      .references(() => customerSegments.id, { onDelete: 'cascade' }),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    
    // For automated segments
    auto_added: boolean('auto_added').default(false),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    segmentIdIdx: index('customer_segment_users_segment_id_idx').on(table.segment_id),
    userIdIdx: index('customer_segment_users_user_id_idx').on(table.user_id),
    segmentUserUniqueIdx: uniqueIndex('customer_segment_users_unique_idx').on(
      table.segment_id,
      table.user_id
    ),
  })
);

// Export types
export type CustomerSegment = typeof customerSegments.$inferSelect;
export type NewCustomerSegment = typeof customerSegments.$inferInsert;
export type CustomerSegmentUser = typeof customerSegmentUsers.$inferSelect;
export type NewCustomerSegmentUser = typeof customerSegmentUsers.$inferInsert;

// Note: Temporary reference
const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
