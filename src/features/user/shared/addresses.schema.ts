/**
 * User Addresses Schema
 *
 * Stores user shipping and billing addresses for B2C and B2B customers.
 * Supports international addresses with geo-coordinates for delivery routing.
 *
 * Features:
 * - Multiple addresses per user
 * - Default address per type (billing/shipping)
 * - International address support with country codes
 * - B2B company address support
 * - Geo-coordinates for delivery optimization
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  decimal,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './schema';

// ============================================
// ENUMS
// ============================================

export const addressTypeEnum = pgEnum('address_type', ['billing', 'shipping', 'both', 'company']);

// ============================================
// USER ADDRESSES TABLE
// ============================================

/**
 * User addresses table
 * Supports multiple addresses per user with default selection per type
 */
export const userAddresses = pgTable(
  'user_addresses',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    address_type: addressTypeEnum('address_type').default('shipping').notNull(),
    is_default: boolean('is_default').default(false).notNull(),

    // Recipient info (can differ from user)
    recipient_name: varchar('recipient_name', { length: 255 }).notNull(),
    company_name: varchar('company_name', { length: 255 }), // For B2B addresses
    phone_number: varchar('phone_number', { length: 20 }),
    phone_country_code: varchar('phone_country_code', { length: 5 }), // +91, +1, etc.

    // Address fields
    address_line1: varchar('address_line1', { length: 255 }).notNull(),
    address_line2: varchar('address_line2', { length: 255 }),
    city: varchar('city', { length: 100 }).notNull(),
    state_province: varchar('state_province', { length: 100 }).notNull(),
    postal_code: varchar('postal_code', { length: 20 }).notNull(),
    country: varchar('country', { length: 100 }).notNull(),
    country_code: varchar('country_code', { length: 2 }).notNull(), // ISO 3166-1 alpha-2

    // Geo-coordinates for delivery routing
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),

    // Additional info
    delivery_instructions: text('delivery_instructions'),
    is_international: boolean('is_international').default(false).notNull(),
    tax_id: varchar('tax_id', { length: 50 }), // GST/VAT number for B2B invoices

    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
  },
  table => ({
    // User's addresses lookup
    userIdIdx: index('user_addresses_user_id_idx').on(table.user_id, table.is_deleted),
    // Default address lookup
    userDefaultIdx: index('user_addresses_user_default_idx').on(
      table.user_id,
      table.address_type,
      table.is_default,
      table.is_deleted
    ),
    // Country-based queries for shipping zones
    countryIdx: index('user_addresses_country_idx').on(table.country_code),
  })
);

// Export types for TypeScript
export type UserAddress = typeof userAddresses.$inferSelect;
export type NewUserAddress = typeof userAddresses.$inferInsert;
