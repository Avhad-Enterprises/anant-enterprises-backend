import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  text,
  decimal,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Cart Items Schema
 * Individual items in shopping carts
 */

/**
 * Cart Items Table
 * Line items in cart
 */
export const cartItems = pgTable(
  'cart_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    cart_id: integer('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    
    // Product reference
    product_id: integer('product_id').notNull(),
    variant_id: integer('variant_id'),
    
    // Quantities & Pricing
    quantity: integer('quantity').notNull().default(1),
    unit_price: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    total_price: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
    
    // Discounts
    discount_amount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0.00'),
    
    // Customizations (product add-ons, engraving, etc.)
    customization_data: jsonb('customization_data'),
    
    // Notes
    notes: text('notes'),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    cartIdIdx: index('cart_items_cart_id_idx').on(table.cart_id),
    productIdIdx: index('cart_items_product_id_idx').on(table.product_id),
    variantIdIdx: index('cart_items_variant_id_idx').on(table.variant_id),
  })
);

// Export types
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;

// Note: Temporary reference
const carts = pgTable('carts', {
  id: integer('id').primaryKey(),
});
