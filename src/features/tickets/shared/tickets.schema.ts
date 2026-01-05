/**
 * Tickets Schema
 *
 * Customer support ticket system following industry standards (Zendesk/Freshdesk).
 * Includes SLA tracking, agent assignment, and satisfaction ratings.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/user.schema';
import { orders } from '../../orders/shared/orders.schema';

// ============================================
// ENUMS
// ============================================

export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'urgent']);

export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'pending',
  'waiting_customer',
  'resolved',
  'closed',
]);

export const ticketChannelEnum = pgEnum('ticket_channel', [
  'email',
  'chat',
  'whatsapp',
  'phone',
  'system',
]);

export const ticketSourceEnum = pgEnum('ticket_source', ['store', 'email', 'admin', 'api']);

// ============================================
// TICKETS TABLE
// ============================================

export const tickets = pgTable(
  'tickets',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),
    ticket_number: varchar('ticket_number', { length: 50 }).unique().notNull(),

    // Relationships
    customer_id: uuid('customer_id').references(() => users.id, { onDelete: 'set null' }),
    order_id: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }), // CRITICAL FIX #3A
    assigned_to: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),

    // Case Details
    subject: varchar('subject', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),

    // Classification
    priority: ticketPriorityEnum('priority').default('medium').notNull(),
    status: ticketStatusEnum('status').default('open').notNull(),

    // Source Tracking
    channel: ticketChannelEnum('channel').default('system').notNull(),
    created_via: ticketSourceEnum('created_via').default('store').notNull(),

    // Metadata
    tags: jsonb('tags').default([]),
    notes: text('notes'), // Internal agent notes
    metadata: jsonb('metadata').default({}),

    // SLA Tracking (Industry Standard)
    last_message_at: timestamp('last_message_at').defaultNow().notNull(),
    first_response_at: timestamp('first_response_at'),
    resolved_at: timestamp('resolved_at'),

    // Customer Satisfaction
    satisfaction_rating: integer('satisfaction_rating'), // 1-5 stars
    satisfaction_comment: text('satisfaction_comment'),

    // Audit
    is_active: boolean('is_active').default(true).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    created_by: uuid('created_by')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_at: timestamp('deleted_at'),
    deleted_by: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
  },
  table => ({
    // Performance Indexes
    ticketNumberIdx: index('tickets_ticket_number_idx').on(table.ticket_number),
    customerStatusIdx: index('tickets_customer_status_idx').on(table.customer_id, table.status),
    assignedStatusIdx: index('tickets_assigned_status_idx').on(table.assigned_to, table.status),
    statusPriorityIdx: index('tickets_status_priority_idx').on(table.status, table.priority),
    createdAtIdx: index('tickets_created_at_idx').on(table.created_at),
    categoryIdx: index('tickets_category_idx').on(table.category),
  })
);

// Types
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
