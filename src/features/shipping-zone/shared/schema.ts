import {
  pgTable,
  serial,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  decimal,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Shipping Zones & Rates Schema
 * Zone-based shipping configuration
 */

// Enums
export const shippingZoneTypeEnum = pgEnum('shipping_zone_type', ['country', 'state', 'postal_code']);
export const shippingRateTypeEnum = pgEnum('shipping_rate_type', [
  'flat_rate',
  'weight_based',
  'price_based',
  'free',
]);

/**
 * Shipping Zones Table
 * Geographic zones for shipping
 */
export const shippingZones = pgTable(
  'shipping_zones',
  {
    id: serial('id').primaryKey(),
    
    // Zone info
    name: varchar('name', { length: 180 }).notNull(),
    type: shippingZoneTypeEnum('type').notNull(),
    
    // Coverage
    countries: jsonb('countries'),
    states: jsonb('states'),
    postal_codes: jsonb('postal_codes'),
    
    // Status
    is_active: boolean('is_active').default(true).notNull(),
    
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
    typeIdx: index('shipping_zones_type_idx').on(table.type),
    isActiveIdx: index('shipping_zones_is_active_idx').on(table.is_active),
  })
);

/**
 * Shipping Rates Table
 * Rates for each shipping zone
 */
export const shippingRates = pgTable(
  'shipping_rates',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    zone_id: integer('zone_id')
      .notNull()
      .references(() => shippingZones.id, { onDelete: 'cascade' }),
    
    // Rate info
    name: varchar('name', { length: 180 }).notNull(),
    type: shippingRateTypeEnum('type').notNull(),
    
    // Pricing
    base_price: decimal('base_price', { precision: 12, scale: 2 }).notNull(),
    
    // Weight-based
    min_weight: decimal('min_weight', { precision: 8, scale: 2 }),
    max_weight: decimal('max_weight', { precision: 8, scale: 2 }),
    price_per_kg: decimal('price_per_kg', { precision: 12, scale: 2 }),
    
    // Price-based
    min_order_amount: decimal('min_order_amount', { precision: 12, scale: 2 }),
    max_order_amount: decimal('max_order_amount', { precision: 12, scale: 2 }),
    
    // Free shipping threshold
    free_shipping_threshold: decimal('free_shipping_threshold', { precision: 12, scale: 2 }),
    
    // Delivery estimates
    min_delivery_days: integer('min_delivery_days'),
    max_delivery_days: integer('max_delivery_days'),
    
    // COD
    cod_available: boolean('cod_available').default(false),
    cod_charges: decimal('cod_charges', { precision: 12, scale: 2 }).default('0.00'),
    
    // Status
    is_active: boolean('is_active').default(true).notNull(),
    
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
    zoneIdIdx: index('shipping_rates_zone_id_idx').on(table.zone_id),
    typeIdx: index('shipping_rates_type_idx').on(table.type),
    isActiveIdx: index('shipping_rates_is_active_idx').on(table.is_active),
  })
);

/**
 * Pincode Serviceability Table
 * Check if delivery is available for specific pincodes
 */
export const pincodeServiceability = pgTable(
  'pincode_serviceability',
  {
    id: serial('id').primaryKey(),
    
    // Pincode info
    pincode: varchar('pincode', { length: 20 }).notNull().unique(),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }).default('India'),
    
    // Serviceability
    is_serviceable: boolean('is_serviceable').default(true).notNull(),
    zone_id: integer('zone_id')
      .references(() => shippingZones.id, { onDelete: 'set null' })
      ,
    
    // Delivery estimates
    standard_delivery_days: integer('standard_delivery_days'),
    express_delivery_days: integer('express_delivery_days'),
    
    // COD
    cod_available: boolean('cod_available').default(false),
    
    // Notes
    notes: text('notes'),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    pincodeIdx: index('pincode_serviceability_pincode_idx').on(table.pincode),
    isServiceableIdx: index('pincode_serviceability_is_serviceable_idx').on(table.is_serviceable),
    zoneIdIdx: index('pincode_serviceability_zone_id_idx').on(table.zone_id),
    cityIdx: index('pincode_serviceability_city_idx').on(table.city),
    stateIdx: index('pincode_serviceability_state_idx').on(table.state),
  })
);

// Export types
export type ShippingZone = typeof shippingZones.$inferSelect;
export type NewShippingZone = typeof shippingZones.$inferInsert;
export type ShippingRate = typeof shippingRates.$inferSelect;
export type NewShippingRate = typeof shippingRates.$inferInsert;
export type PincodeServiceability = typeof pincodeServiceability.$inferSelect;
export type NewPincodeServiceability = typeof pincodeServiceability.$inferInsert;
