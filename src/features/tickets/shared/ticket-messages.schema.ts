/**
 * Ticket Messages Schema
 *
 * Conversation thread for support tickets.
 * Supports customer messages, agent replies, system notifications, and internal notes.
 */

import {
    pgTable,
    uuid,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
    pgEnum,
    index,
} from 'drizzle-orm/pg-core';
import { tickets } from './tickets.schema';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const ticketMessageSenderTypeEnum = pgEnum('ticket_message_sender_type', [
    'customer',
    'agent',
    'system',
    'note'
]);

// ============================================
// TICKET MESSAGES TABLE
// ============================================

export const ticketMessages = pgTable(
    'ticket_messages',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),
        ticket_id: uuid('ticket_id')
            .references(() => tickets.id, { onDelete: 'cascade' })
            .notNull(),

        // Sender Information
        sender_type: ticketMessageSenderTypeEnum('sender_type').default('customer').notNull(),
        sender_id: uuid('sender_id')
            .references(() => users.id, { onDelete: 'set null' }),

        // Content
        message: text('message').notNull(),
        attachments: jsonb('attachments').default([]),

        // Visibility
        is_internal: boolean('is_internal').default(false).notNull(),

        // Audit
        created_at: timestamp('created_at').defaultNow().notNull(),
        created_by: uuid('created_by')
            .references(() => users.id, { onDelete: 'set null' })
            .notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        updated_by: uuid('updated_by')
            .references(() => users.id, { onDelete: 'set null' }),
        is_deleted: boolean('is_deleted').default(false).notNull(),
        deleted_at: timestamp('deleted_at'),
        deleted_by: uuid('deleted_by')
            .references(() => users.id, { onDelete: 'set null' }),
    },
    table => ({
        ticketCreatedIdx: index('ticket_messages_ticket_created_idx').on(table.ticket_id, table.created_at),
        senderTypeIdx: index('ticket_messages_sender_type_idx').on(table.sender_type),
    })
);

// Types
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type NewTicketMessage = typeof ticketMessages.$inferInsert;
