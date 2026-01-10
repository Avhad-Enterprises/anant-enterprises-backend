/**
 * Discount Advanced Schema
 *
 * Junction tables for advanced discount targeting and configuration:
 * - Customer-specific discounts
 * - Customer segment targeting
 * - Geographic restrictions
 * - Product/collection exclusions
 * - Buy X Get Y specific products
 * - Shipping method/zone restrictions
 */

import { pgTable, uuid, varchar, primaryKey, index } from 'drizzle-orm/pg-core';
import { discounts } from './discount.schema';
import { users } from '../../user/shared/user.schema';
import { products } from '../../product/shared/product.schema';
import { collections } from '../../collection/shared/collection.schema';

// ============================================
// DISCOUNT CUSTOMERS (Specific Customer Targeting)
// ============================================

export const discountCustomers = pgTable(
    'discount_customers',
    {
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        user_id: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
    },
    table => ({
        pk: primaryKey({ columns: [table.discount_id, table.user_id] }),
        userIdIdx: index('discount_customers_user_id_idx').on(table.user_id),
    })
);

// ============================================
// DISCOUNT SEGMENTS (Customer Segment Targeting)
// ============================================

export const discountSegments = pgTable(
    'discount_segments',
    {
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        segment_id: varchar('segment_id', { length: 50 }).notNull(), // vip, new, returning, at_risk, wholesale
    },
    table => ({
        pk: primaryKey({ columns: [table.discount_id, table.segment_id] }),
        segmentIdIdx: index('discount_segments_segment_id_idx').on(table.segment_id),
    })
);

// ============================================
// DISCOUNT REGIONS (Geographic Restrictions)
// ============================================

export const discountRegions = pgTable(
    'discount_regions',
    {
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        country_code: varchar('country_code', { length: 3 }).notNull(), // ISO 3166-1 alpha-2 or alpha-3
        region_code: varchar('region_code', { length: 10 }), // State/province code (optional)
    },
    table => ({
        pk: primaryKey({ columns: [table.discount_id, table.country_code] }),
        countryCodeIdx: index('discount_regions_country_code_idx').on(table.country_code),
    })
);

// ============================================
// DISCOUNT EXCLUSIONS (Products, Collections, Payment Methods, Channels)
// ============================================

export const discountExclusions = pgTable(
    'discount_exclusions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        exclusion_type: varchar('exclusion_type', { length: 30 }).notNull(), // product, collection, payment_method, sales_channel
        exclusion_value: varchar('exclusion_value', { length: 100 }).notNull(), // UUID for product/collection, string for others
    },
    table => ({
        discountIdx: index('discount_exclusions_discount_id_idx').on(table.discount_id),
        typeIdx: index('discount_exclusions_type_idx').on(table.exclusion_type),
    })
);

// ============================================
// BUY X PRODUCTS (Products that trigger Buy X Get Y)
// ============================================

export const discountBuyXProducts = pgTable(
    'discount_buy_x_products',
    {
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'cascade' })
            .notNull(),
    },
    table => ({
        pk: primaryKey({ columns: [table.discount_id, table.product_id] }),
        productIdIdx: index('discount_buy_x_products_product_id_idx').on(table.product_id),
    })
);

// ============================================
// BUY X COLLECTIONS (Collections that trigger Buy X Get Y)
// ============================================

export const discountBuyXCollections = pgTable(
    'discount_buy_x_collections',
    {
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        collection_id: uuid('collection_id')
            .references(() => collections.id, { onDelete: 'cascade' })
            .notNull(),
    },
    table => ({
        pk: primaryKey({ columns: [table.discount_id, table.collection_id] }),
        collectionIdIdx: index('discount_buy_x_collections_collection_id_idx').on(table.collection_id),
    })
);

// ============================================
// GET Y PRODUCTS (Reward products for Buy X Get Y)
// ============================================

export const discountGetYProducts = pgTable(
    'discount_get_y_products',
    {
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'cascade' })
            .notNull(),
    },
    table => ({
        pk: primaryKey({ columns: [table.discount_id, table.product_id] }),
        productIdIdx: index('discount_get_y_products_product_id_idx').on(table.product_id),
    })
);

// ============================================
// GET Y COLLECTIONS (Reward collections for Buy X Get Y)
// ============================================

export const discountGetYCollections = pgTable(
    'discount_get_y_collections',
    {
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        collection_id: uuid('collection_id')
            .references(() => collections.id, { onDelete: 'cascade' })
            .notNull(),
    },
    table => ({
        pk: primaryKey({ columns: [table.discount_id, table.collection_id] }),
        collectionIdIdx: index('discount_get_y_collections_collection_id_idx').on(table.collection_id),
    })
);

// ============================================
// SHIPPING METHODS (For Free Shipping Discounts)
// ============================================

export const discountShippingMethods = pgTable(
    'discount_shipping_methods',
    {
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        shipping_method_id: varchar('shipping_method_id', { length: 50 }).notNull(), // standard, express, sameday, etc.
    },
    table => ({
        pk: primaryKey({ columns: [table.discount_id, table.shipping_method_id] }),
        methodIdIdx: index('discount_shipping_methods_method_id_idx').on(table.shipping_method_id),
    })
);

// ============================================
// SHIPPING ZONES (For Free Shipping Discounts)
// ============================================

export const discountShippingZones = pgTable(
    'discount_shipping_zones',
    {
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        shipping_zone_id: varchar('shipping_zone_id', { length: 50 }).notNull(), // us, ca, eu, apac, etc.
    },
    table => ({
        pk: primaryKey({ columns: [table.discount_id, table.shipping_zone_id] }),
        zoneIdIdx: index('discount_shipping_zones_zone_id_idx').on(table.shipping_zone_id),
    })
);

// ============================================
// TYPES
// ============================================

export type DiscountCustomer = typeof discountCustomers.$inferSelect;
export type DiscountSegment = typeof discountSegments.$inferSelect;
export type DiscountRegion = typeof discountRegions.$inferSelect;
export type DiscountExclusion = typeof discountExclusions.$inferSelect;
export type DiscountBuyXProduct = typeof discountBuyXProducts.$inferSelect;
export type DiscountBuyXCollection = typeof discountBuyXCollections.$inferSelect;
export type DiscountGetYProduct = typeof discountGetYProducts.$inferSelect;
export type DiscountGetYCollection = typeof discountGetYCollections.$inferSelect;
export type DiscountShippingMethod = typeof discountShippingMethods.$inferSelect;
export type DiscountShippingZone = typeof discountShippingZones.$inferSelect;
