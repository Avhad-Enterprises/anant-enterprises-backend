import { pgTable, uuid, varchar, text, timestamp, boolean, index, pgEnum, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const segmentPurposeEnum = pgEnum('segment_purpose', [
    'marketing-campaign',
    'email-campaign',
    'sms-campaign',
    'loyalty-program',
    'risk-management',
    'analytics',
]);

export const segmentPriorityEnum = pgEnum('segment_priority', [
    'critical',
    'high',
    'normal',
    'low',
]);

export const segmentTypeEnum = pgEnum('segment_type', [
    'manual',
    'automated',
]);

export const segmentMatchTypeEnum = pgEnum('segment_match_type', [
    'all', // AND
    'any', // OR
]);

// ============================================
// CUSTOMER SEGMENTS TABLE
// ============================================

export const customerSegments = pgTable(
    'customer_segments',
    {
        id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
        name: varchar('name', { length: 255 }).notNull(),
        code: varchar('code', { length: 100 }).unique().notNull(),
        description: text('description'),
        purpose: segmentPurposeEnum('purpose').default('marketing-campaign').notNull(),
        priority: segmentPriorityEnum('priority').default('normal').notNull(),
        status: boolean('status').default(true).notNull(),
        type: segmentTypeEnum('type').default('automated').notNull(),
        match_type: segmentMatchTypeEnum('match_type').default('all').notNull(),
        admin_comment: text('admin_comment'),
        tags: text('tags').array().default(sql`ARRAY[]::text[]`).notNull(),

        // Insights
        estimated_users: integer('estimated_users').default(0),
        last_refreshed_at: timestamp('last_refreshed_at').defaultNow(),

        // Audit fields
        created_by: uuid('created_by'), // Links to users.id (admin)
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_by: uuid('updated_by'),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        is_deleted: boolean('is_deleted').default(false).notNull(),
        deleted_by: uuid('deleted_by'),
        deleted_at: timestamp('deleted_at'),
    },
    table => ({
        nameIdx: index('customer_segments_name_idx').on(table.name),
        codeIdx: index('customer_segments_code_idx').on(table.code),
        statusIdx: index('customer_segments_status_idx').on(table.status),
        typeIdx: index('customer_segments_type_idx').on(table.type),
    })
);

// ============================================
// CUSTOMER SEGMENT RULES TABLE
// ============================================

export const customerSegmentRules = pgTable(
    'customer_segment_rules',
    {
        id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
        segment_id: uuid('segment_id')
            .references(() => customerSegments.id, { onDelete: 'cascade' })
            .notNull(),
        field: varchar('field', { length: 100 }).notNull(), // e.g., 'first_name', 'total_spent'
        condition: varchar('condition', { length: 50 }).notNull(), // e.g., 'equals', 'contains', 'gt'
        value: text('value').notNull(),
        created_at: timestamp('created_at').defaultNow().notNull(),
    },
    table => ({
        segmentIdIdx: index('customer_segment_rules_segment_id_idx').on(table.segment_id),
    })
);

// ============================================
// CUSTOMER SEGMENT MEMBERS TABLE (Manual)
// ============================================

export const customerSegmentMembers = pgTable(
    'customer_segment_members',
    {
        id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
        segment_id: uuid('segment_id')
            .references(() => customerSegments.id, { onDelete: 'cascade' })
            .notNull(),
        user_id: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        added_at: timestamp('added_at').defaultNow().notNull(),
        added_by: uuid('added_by'), // Admin who added
    },
    table => ({
        segmentUserIdx: index('customer_segment_members_segment_user_idx').on(table.segment_id, table.user_id),
    })
);

// Types
export type CustomerSegment = typeof customerSegments.$inferSelect;
export type NewCustomerSegment = typeof customerSegments.$inferInsert;
export type CustomerSegmentRule = typeof customerSegmentRules.$inferSelect;
export type NewCustomerSegmentRule = typeof customerSegmentRules.$inferInsert;
export type CustomerSegmentMember = typeof customerSegmentMembers.$inferSelect;
export type NewCustomerSegmentMember = typeof customerSegmentMembers.$inferInsert;
