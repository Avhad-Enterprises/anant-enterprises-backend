import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  text,
  index,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * Ticket Messages Schema
 * Conversation threads for support tickets
 */

// Enums
export const messageSenderTypeEnum = pgEnum('message_sender_type', ['customer', 'agent', 'system']);

/**
 * Ticket Messages Table
 * Individual messages in ticket conversation
 */
export const ticketMessages = pgTable(
  'ticket_messages',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    ticket_id: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    
    // Sender info
    sender_type: messageSenderTypeEnum('sender_type').notNull(),
    sender_id: integer('sender_id').references(() => users.id, { onDelete: 'set null' }),
    sender_name: varchar('sender_name', { length: 255 }).notNull(),
    sender_email: varchar('sender_email', { length: 190 }),
    
    // Message content
    message: text('message').notNull(),
    
    // Metadata
    is_internal: boolean('is_internal').default(false),
    is_read: boolean('is_read').default(false),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    ticketIdIdx: index('ticket_messages_ticket_id_idx').on(table.ticket_id),
    senderIdIdx: index('ticket_messages_sender_id_idx').on(table.sender_id),
    senderTypeIdx: index('ticket_messages_sender_type_idx').on(table.sender_type),
    isInternalIdx: index('ticket_messages_is_internal_idx').on(table.is_internal),
    createdAtIdx: index('ticket_messages_created_at_idx').on(table.created_at),
  })
);

/**
 * Ticket Attachments Table
 * File uploads in tickets
 */
export const ticketAttachments = pgTable(
  'ticket_attachments',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    ticket_id: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    message_id: integer('message_id')
      .references(() => ticketMessages.id, { onDelete: 'cascade' })
      ,
    
    // File info
    filename: varchar('filename', { length: 255 }).notNull(),
    original_filename: varchar('original_filename', { length: 255 }).notNull(),
    file_path: varchar('file_path', { length: 500 }).notNull(),
    file_url: varchar('file_url', { length: 500 }).notNull(),
    mime_type: varchar('mime_type', { length: 100 }).notNull(),
    file_size: integer('file_size').notNull(),
    
    // Audit fields
    uploaded_by: integer('uploaded_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    ticketIdIdx: index('ticket_attachments_ticket_id_idx').on(table.ticket_id),
    messageIdIdx: index('ticket_attachments_message_id_idx').on(table.message_id),
  })
);

// Export types
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type NewTicketMessage = typeof ticketMessages.$inferInsert;
export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type NewTicketAttachment = typeof ticketAttachments.$inferInsert;

// Note: Temporary references
const tickets = pgTable('tickets', {
  id: integer('id').primaryKey(),
});

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
