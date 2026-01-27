/**
 * Inventory Locations Schema
 *
 * Manages physical locations where inventory is stored (warehouses, factories, stores, transit).
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const locationTypeEnum = pgEnum('location_type', [
  'warehouse',
  'factory',
  'store',
  'transit',
]);

// ============================================
// INVENTORY LOCATIONS TABLE
// ============================================

export const inventoryLocations = pgTable(
  'inventory_locations',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),
    location_code: varchar('location_code', { length: 50 }).unique().notNull(), // "WH-MUM-01"
    name: varchar('name', { length: 255 }).unique().notNull(), // "Mumbai Main Warehouse"

    // Classification
    type: locationTypeEnum('type').notNull(),

    // Address
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }),
    postal_code: varchar('postal_code', { length: 20 }),

    // Contact Information
    contact_person: varchar('contact_person', { length: 255 }),
    phone_number: varchar('phone_number', { length: 20 }),
    email: varchar('email', { length: 255 }),

    // Status
    is_active: boolean('is_active').default(true).notNull(),
    is_default: boolean('is_default').default(false).notNull(),

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  },
  table => ({
    // Indexes
    locationCodeIdx: index('inventory_locations_code_idx').on(table.location_code),
    typeActiveIdx: index('inventory_locations_type_active_idx').on(table.type, table.is_active),
    // Index for default location lookup
    defaultIdx: index('inventory_locations_default_idx').on(table.is_default),
  })
);

// Types
export type InventoryLocation = typeof inventoryLocations.$inferSelect;
export type NewInventoryLocation = typeof inventoryLocations.$inferInsert;
