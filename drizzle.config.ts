import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'development') {
  dotenv.config({ path: '.env.dev' });
} else if (nodeEnv === 'production') {
  dotenv.config({ path: '.env.prod' });
} else if (nodeEnv === 'test') {
  dotenv.config({ path: '.env.dev' }); // Use same env as development
}
dotenv.config();

/**
 * Get database URL from environment
 */
function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || '';
}

export default defineConfig({
  schema: [
    // Core User & Auth (4 tables: users, addresses, customer_profiles, admin_profiles)
    './src/features/user/shared/user.schema.ts',
    './src/features/user/shared/addresses.schema.ts',
    './src/features/user/shared/customer-profiles.schema.ts',
    './src/features/user/shared/admin-profiles.schema.ts',
    
    // RBAC (4 tables: roles, permissions, role_permissions, user_roles)
    './src/features/rbac/shared/roles.schema.ts',
    './src/features/rbac/shared/permissions.schema.ts',
    './src/features/rbac/shared/role-permissions.schema.ts',
    './src/features/rbac/shared/user-roles.schema.ts',
    
    // Invitations (1 table: admin_invites)
    './src/features/admin-invite/shared/admin-invite.schema.ts',
    
    // Products & Collections (6 tables: products, product_faqs, collections, collection_products, tiers, tags)
    './src/features/product/shared/product.schema.ts',
    './src/features/product/shared/product-faqs.schema.ts',
    './src/features/collection/shared/collection.schema.ts',
    './src/features/collection/shared/collection-products.schema.ts',
    './src/features/tiers/shared/tiers.schema.ts',
    './src/features/tags/shared/tags.schema.ts',
    
    // Reviews & Wishlists (4 tables)
    './src/features/reviews/shared/reviews.schema.ts',
    './src/features/reviews/shared/product-questions.schema.ts',
    './src/features/wishlist/shared/wishlist.schema.ts',
    './src/features/wishlist/shared/wishlist-items.schema.ts',
    
    // Inventory (4 tables: inventory_locations, inventory, inventory_adjustments, variant_inventory_adjustments)
    './src/features/inventory/shared/inventory-locations.schema.ts',
    './src/features/inventory/shared/inventory.schema.ts',
    './src/features/inventory/shared/inventory-adjustments.schema.ts',
    './src/features/inventory/shared/variant-inventory-adjustments.schema.ts',
    
    // Cart & Orders (4 tables: carts, cart_items, orders, order_items)
    './src/features/cart/shared/carts.schema.ts',
    './src/features/cart/shared/cart-items.schema.ts',
    './src/features/orders/shared/orders.schema.ts',
    './src/features/orders/shared/order-items.schema.ts',
    
    // Payments & Invoices (5 tables: payment_transactions, webhook_logs, invoices, invoice_versions, invoice_line_items)
    './src/features/payments/shared/payment-transactions.schema.ts',
    './src/features/payments/shared/webhook-logs.schema.ts',
    './src/features/invoices/shared/invoices.schema.ts',
    './src/features/invoices/shared/invoice-versions.schema.ts',
    './src/features/invoices/shared/invoice-line-items.schema.ts',
    
    // Notifications (5 tables: notification_enums must be first)
    './src/features/notifications/shared/notification-enums.schema.ts',
    './src/features/notifications/shared/notifications.schema.ts',
    './src/features/notifications/shared/notification-templates.schema.ts',
    './src/features/notifications/shared/notification-preferences.schema.ts',
    './src/features/notifications/shared/notification-delivery-logs.schema.ts',
    
    // Blog & Content (2 tables: blog, blog_subsections)
    './src/features/blog/shared/blog.schema.ts',
    './src/features/blog/shared/blog-subsections.schema.ts',
    
    // Uploads & Audit (3 tables: uploads, audit_logs, email_otp)
    './src/features/upload/shared/upload.schema.ts',
    './src/features/audit/shared/audit-logs.schema.ts',
    './src/features/user/shared/email-otp.schema.ts',
  ],
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});
