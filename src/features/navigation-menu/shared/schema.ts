import {
  pgTable,
  serial,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Navigation Menus Schema
 * Flexible menu system for header, footer, sidebar, etc.
 */

// Enums
export const menuLocationEnum = pgEnum('menu_location', [
  'header',
  'footer',
  'sidebar',
  'mobile',
  'custom',
]);

export const menuItemTypeEnum = pgEnum('menu_item_type', [
  'page',
  'category',
  'collection',
  'product',
  'blog',
  'custom_url',
]);

/**
 * Navigation Menus Table
 * Menu containers (e.g., Main Menu, Footer Menu)
 */
export const navigationMenus = pgTable(
  'navigation_menus',
  {
    id: serial('id').primaryKey(),
    
    // Basic info
    name: varchar('name', { length: 180 }).notNull(),
    handle: varchar('handle', { length: 180 }).notNull().unique(),
    location: menuLocationEnum('location').notNull(),
    
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
    handleUniqueIdx: uniqueIndex('navigation_menus_handle_unique_idx').on(table.handle),
    locationIdx: index('navigation_menus_location_idx').on(table.location),
    isActiveIdx: index('navigation_menus_is_active_idx').on(table.is_active),
  })
);

/**
 * Navigation Menu Items Table
 * Individual menu items with nested structure
 */
export const navigationMenuItems = pgTable(
  'navigation_menu_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    menu_id: integer('menu_id')
      .notNull()
      .references(() => navigationMenus.id, { onDelete: 'cascade' }),
    parent_id: integer('parent_id'),
    
    // Item details
    label: varchar('label', { length: 180 }).notNull(),
    type: menuItemTypeEnum('type').notNull(),
    
    // Target reference (based on type)
    target_id: integer('target_id'),
    url: varchar('url', { length: 500 }),
    
    // Display options
    icon: varchar('icon', { length: 100 }),
    css_class: varchar('css_class', { length: 100 }),
    open_in_new_tab: boolean('open_in_new_tab').default(false),
    
    // Positioning
    position: integer('position').default(0),
    level: integer('level').default(0),
    
    // Status
    is_active: boolean('is_active').default(true).notNull(),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    menuIdIdx: index('navigation_menu_items_menu_id_idx').on(table.menu_id),
    parentIdIdx: index('navigation_menu_items_parent_id_idx').on(table.parent_id),
    typeIdx: index('navigation_menu_items_type_idx').on(table.type),
    targetIdIdx: index('navigation_menu_items_target_id_idx').on(table.target_id),
    positionIdx: index('navigation_menu_items_position_idx').on(table.position),
    isActiveIdx: index('navigation_menu_items_is_active_idx').on(table.is_active),
  })
);

// Export types
export type NavigationMenu = typeof navigationMenus.$inferSelect;
export type NewNavigationMenu = typeof navigationMenus.$inferInsert;
export type NavigationMenuItem = typeof navigationMenuItems.$inferSelect;
export type NewNavigationMenuItem = typeof navigationMenuItems.$inferInsert;
