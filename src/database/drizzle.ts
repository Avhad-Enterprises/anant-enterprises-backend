import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { logger } from '../utils';
import { config, isProduction, isDevelopment } from '../utils/validateEnv';

// Import all schemas directly from .schema.ts files to avoid circular deps with drizzle-kit
import { users, genderEnum } from '../features/user/shared/user.schema';
import { userAddresses, addressLabelEnum } from '../features/address/shared/addresses.schema';
import { customerProfiles, customerAccountStatusEnum } from '../features/customer/shared/customer-profiles.schema';
import { adminProfiles } from '../features/admin/shared/admin-profiles.schema';
import { uploads } from '../features/upload/shared/upload.schema';
import { invitations } from '../features/admin-invite/shared/admin-invite.schema';
// COMMENTED OUT - Unused tables (31 Jan 2026)
// import { chatbotDocuments, chatbotSessions, chatbotMessages } from '../features/chatbot';
import { roles } from '../features/rbac/shared/roles.schema';
import { permissions } from '../features/rbac/shared/permissions.schema';
import { rolePermissions } from '../features/rbac/shared/role-permissions.schema';
import { userRoles } from '../features/rbac/shared/user-roles.schema';
// COMMENTED OUT - Dropped in Phase 2 (31 Jan 2026)
// import {
//   currencies,
//   taxRules,
//   taxTypeEnum,
//   taxAppliesToEnum,
//   countries,
//   regions,
// } from '../features/settings';
import { products, productStatusEnum } from '../features/product/shared/products.schema';
import { productVariants } from '../features/product/shared/product-variants.schema';
import { productFaqs } from '../features/product/shared/product-faqs.schema';
import { collections, collectionTypeEnum, collectionStatusEnum, collectionSortOrderEnum, conditionMatchTypeEnum } from '../features/collection/shared/collection.schema';
import { collectionProducts } from '../features/collection/shared/collection-products.schema';
import { tiers, tierStatusEnum } from '../features/tiers/shared/tiers.schema';
import { tags } from '../features/tags/shared/tags.schema';
// COMMENTED OUT - Dropped in Phase 3 (31 Jan 2026)
// import {
//   discounts,
//   discountCodes,
//   discountProducts,
//   discountCollections,
//   discountTypeEnum,
//   discountStatusEnum,
//   minRequirementTypeEnum,
// } from '../features/discount';
import { wishlists } from '../features/wishlist/shared/wishlist.schema';
import { wishlistItems } from '../features/wishlist/shared/wishlist-items.schema';
// COMMENTED OUT - Dropped in Phase 4 (31 Jan 2026)
// import { faqs, faqTargetTypeEnum } from '../features/faq';
// COMMENTED OUT - Unused tables (31 Jan 2026)
// import {
//   companies,
//   companyRules,
//   userAssignmentTypeEnum,
//   companyMatchTypeEnum,
// } from '../features/company';
// COMMENTED OUT - Unused tables (31 Jan 2026)
// import {
//   catalogues,
//   catalogueRules,
//   catalogueProductOverrides,
//   catalogueStatusEnum,
//   catalogueRuleMatchTypeEnum,
//   catalogueAdjustmentTypeEnum,
// } from '../features/catalogue';
import { blogs, blogStatusEnum } from '../features/blog/shared/blog.schema';
import { blogSubsections } from '../features/blog/shared/blog-subsections.schema';
import { reviews, reviewStatusEnum } from '../features/reviews/shared/reviews.schema';
import { productQuestions, questionStatusEnum } from '../features/reviews/shared/product-questions.schema';
// COMMENTED OUT - Dropped in Phase 3 (31 Jan 2026)
// import { bundles, /* bundleItems, */ bundleTypeEnum, bundleStatusEnum } from '../features/bundles';
// COMMENTED OUT - Unused tables (31 Jan 2026)
// import {
//   giftCards,
//   giftCardTransactions,
//   giftCardTemplates,
//   giftCardStatusEnum,
//   giftCardDeliveryMethodEnum,
//   giftCardSourceEnum,
//   giftCardTransactionTypeEnum,
//   giftCardCharacterSetEnum,
// } from '../features/giftcards';
import { inventoryLocations, locationTypeEnum } from '../features/inventory/shared/inventory-locations.schema';
import { inventory, inventoryStatusEnum } from '../features/inventory/shared/inventory.schema';
import { inventoryAdjustments, adjustmentTypeEnum, approvalStatusEnum } from '../features/inventory/shared/inventory-adjustments.schema';
// REMOVED: variantInventoryAdjustments (Phase 2A - unified into inventory table)
import { carts, cartStatusEnum, cartSourceEnum } from '../features/cart/shared/carts.schema';
import { cartItems } from '../features/cart/shared/cart-items.schema';
// COMMENTED OUT - Unused tables (31 Jan 2026)
// import {
//   tickets,
//   ticketMessages,
//   ticketPriorityEnum,
//   ticketStatusEnum,
//   ticketChannelEnum,
//   ticketSourceEnum,
//   ticketMessageSenderTypeEnum,
// } from '../features/tickets';
import { orders, orderChannelEnum, paymentStatusEnum, orderDiscountTypeEnum, fulfillmentStatusEnum } from '../features/orders/shared/orders.schema';
import { orderItems } from '../features/orders/shared/order-items.schema';
import { ordersRelations, orderItemsRelations } from '../features/orders/shared/orders.relations';
import { paymentTransactions, paymentTransactionStatusEnum } from '../features/payments/shared/payment-transactions.schema';
import { paymentWebhookLogs } from '../features/payments/shared/webhook-logs.schema';
import { invoices, invoiceStatusEnum } from '../features/invoice/shared/invoices.schema';
import { invoiceVersions, invoiceVersionReasonEnum, invoiceTaxTypeEnum } from '../features/invoice/shared/invoice-versions.schema';
import { invoiceLineItems } from '../features/invoice/shared/invoice-line-items.schema';
// sessions table - REMOVED (31 Jan 2026)

// COMMENTED OUT - Dropped in Phase 4 (31 Jan 2026)
// import {
//   entityMedia,
//   entityTypeEnum,
//   mediaTypeEnum,
// } from '../features/media-manager';
import { notificationTypeEnum, notificationPriorityEnum, notificationFrequencyEnum, deliveryStatusEnum } from '../features/notifications/shared/notification-enums.schema';
import { notifications } from '../features/notifications/shared/notifications.schema';
import { notificationTemplates } from '../features/notifications/shared/notification-templates.schema';
import { notificationPreferences } from '../features/notifications/shared/notification-preferences.schema';
import { notificationDeliveryLogs } from '../features/notifications/shared/notification-delivery-logs.schema';
import {
  customerSegments,
  customerSegmentRules,
  customerSegmentMembers,
  segmentPurposeEnum,
  segmentPriorityEnum,
  segmentTypeEnum,
  segmentMatchTypeEnum,
} from '../features/customer-segment/shared/customer-segments.schema';

/**
 * Database connection configuration
 */
const connectionString = config.DATABASE_URL;

if (!connectionString) {
  logger.error('DATABASE_URL environment variable is required for database connection');
  throw new Error('DATABASE_URL environment variable is required for database connection');
}

/**
 * PostgreSQL connection pool using node-postgres (pg)
 * More mature and production-ready than postgres-js
 *
 * SSL Configuration:
 * - Production: Requires SSL with certificate validation
 * - Set DATABASE_SSL_CA env var for custom CA certificate
 * - Development: No SSL required
 */
const sslConfig = isProduction
  ? {
    rejectUnauthorized: false, // Supabase uses self-signed certificates
    // If using self-signed certs, set DATABASE_SSL_CA env var
    ca: process.env.DATABASE_SSL_CA || undefined,
  }
  : undefined;

export const pool = new Pool({
  connectionString,
  max: 10, // Maximum number of connections in pool
  idleTimeoutMillis: 20000, // Close idle connections after 20 seconds
  connectionTimeoutMillis: 10000, // Connection timeout in milliseconds
  ssl: sslConfig,
});

/**
 * Retry database connection with exponential backoff
 * Useful in containerized environments where DB may not be ready immediately
 */
export async function connectWithRetry(
  maxRetries: number = 5,
  baseDelayMs: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      logger.info(`Database connected successfully on attempt ${attempt}`);
      return true;
    } catch (error) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn(
        `Database connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`Failed to connect to database after ${maxRetries} attempts`);
  return false;
}

/**
 * Combined schema for Drizzle
 * Includes all tables and enums for migrations
 */
export const schema = {
  // User feature - core
  users,
  genderEnum,
  // User feature - addresses
  userAddresses,
  addressLabelEnum,
  // COMMENTED OUT - Dropped in Phase 4 (31 Jan 2026)
  // User feature - payments
  // userPaymentMethods,
  // paymentTypeEnum,
  // cardFundingEnum,
  // User feature - customer profiles
  customerProfiles,
  customerAccountStatusEnum,
  // COMMENTED OUT - Dropped in Phase 2 (31 Jan 2026)
  // User feature - business profiles (B2B)
  // businessCustomerProfiles,
  // businessTypeEnum,
  // paymentTermsEnum,
  // businessTierEnum,
  // businessAccountStatusEnum,
  // User feature - admin profiles
  adminProfiles,
  // User feature - vendors (TODO: Enable when vendor feature is needed)
  // vendors,
  // vendorTypeEnum,
  // COMMENTED OUT - Dropped in Phase 2 (31 Jan 2026)
  // User feature - statistics
  // customerStatistics,
  // Upload feature
  uploads,
  // Admin invite feature
  invitations,
  // Chatbot feature - COMMENTED OUT (31 Jan 2026)
  // chatbotDocuments,
  // chatbotSessions,
  // chatbotMessages,
  // RBAC feature
  roles,
  permissions,
  rolePermissions,
  userRoles,
  // COMMENTED OUT - Dropped in Phase 2 (31 Jan 2026)
  // Settings feature
  // currencies,
  // taxRules,
  // taxTypeEnum,
  // taxAppliesToEnum,
  // countries,
  // regions,
  // Product feature
  products,
  productFaqs,
  productVariants,
  productStatusEnum,
  // Collection feature
  collections,
  // collectionRules, // REMOVED - Unused table (31 Jan 2026)
  collectionProducts,
  collectionTypeEnum,
  collectionStatusEnum,
  collectionSortOrderEnum,
  conditionMatchTypeEnum,
  // Tier feature
  tiers,
  tierStatusEnum,
  // Tags feature
  tags,
  // COMMENTED OUT - Dropped in Phase 3 (31 Jan 2026)
  // Discount feature
  // discounts,
  // discountCodes,
  // discountProducts,
  // discountCollections,
  // discountTypeEnum,
  // discountStatusEnum,
  // minRequirementTypeEnum,
  // Wishlist feature
  wishlists,
  wishlistItems,
  // COMMENTED OUT - Dropped in Phase 4 (31 Jan 2026)
  // FAQ feature
  // faqs,
  // faqTargetTypeEnum,
  // Company feature - COMMENTED OUT (31 Jan 2026)
  // companies,
  // companyRules,
  // userAssignmentTypeEnum,
  // // companyMatchTypeEnum,
  // Catalogue feature - COMMENTED OUT (31 Jan 2026)
  // catalogues,
  // catalogueRules,
  // catalogueProductOverrides,
  // catalogueStatusEnum,
  // catalogueRuleMatchTypeEnum,
  // catalogueAdjustmentTypeEnum,
  // Blog feature
  blogs,
  blogSubsections,
  blogStatusEnum,
  // Review feature
  reviews,
  productQuestions,
  reviewStatusEnum,
  questionStatusEnum,
  // COMMENTED OUT - Dropped in Phase 3 (31 Jan 2026)
  // Bundle feature
  // bundles,
  // bundleItems, // COMMENTED OUT (31 Jan 2026) - Keep bundles due to FK from cart_items
  // bundleTypeEnum,
  // bundleStatusEnum,
  // Gift Card feature - COMMENTED OUT (31 Jan 2026)
  // giftCards,
  // giftCardTransactions,
  // giftCardTemplates,
  // giftCardStatusEnum,
  // giftCardDeliveryMethodEnum,
  // giftCardSourceEnum,
  // giftCardTransactionTypeEnum,
  // giftCardCharacterSetEnum,
  // Inventory feature
  inventoryLocations,
  inventory,
  inventoryAdjustments,
  // variantInventoryAdjustments, // REMOVED (Phase 2A - 31 Jan 2026)
  // productionOrders, // COMMENTED OUT (31 Jan 2026)
  locationTypeEnum,
  inventoryStatusEnum,
  adjustmentTypeEnum,
  approvalStatusEnum,
  // productionStatusEnum, // COMMENTED OUT (31 Jan 2026)
  // productionPriorityEnum, // COMMENTED OUT (31 Jan 2026)
  // Cart feature
  carts,
  cartItems,
  cartStatusEnum,
  cartSourceEnum,
  // Tickets feature - COMMENTED OUT (31 Jan 2026)
  // tickets,
  // ticketMessages,
  // ticketPriorityEnum,
  // ticketStatusEnum,
  // ticketChannelEnum,
  // ticketSourceEnum,
  // ticketMessageSenderTypeEnum,
  // Orders feature
  orders,
  orderItems,
  orderChannelEnum,
  paymentStatusEnum,
  orderDiscountTypeEnum,
  fulfillmentStatusEnum,
  ordersRelations,
  orderItemsRelations,
  // Payments feature
  paymentTransactions,
  paymentTransactionStatusEnum,
  paymentWebhookLogs,
  // Invoices feature
  invoices,
  invoiceVersions,
  invoiceLineItems,
  invoiceStatusEnum,
  invoiceVersionReasonEnum,
  invoiceTaxTypeEnum,
  // Profile feature
  // sessions, // REMOVED - Unused table (31 Jan 2026)
  // COMMENTED OUT - Dropped in Phase 4 (31 Jan 2026)
  // Media Manager feature
  // entityMedia,
  // entityTypeEnum,
  // mediaTypeEnum,
  // Notifications feature
  notifications,
  notificationTemplates,
  notificationPreferences,
  notificationDeliveryLogs,
  notificationTypeEnum,
  notificationPriorityEnum,
  notificationFrequencyEnum,
  deliveryStatusEnum,
  // Customer Segments feature
  customerSegments,
  customerSegmentRules,
  customerSegmentMembers,
  segmentPurposeEnum,
  segmentPriorityEnum,
  segmentTypeEnum,
  segmentMatchTypeEnum,
};

/**
 * Drizzle database instance
 * This is the main database client used throughout the application
 */
export const db = drizzle(pool, {
  schema,
  logger: isDevelopment,
});

/**
 * Close database connection
 * Should be called when shutting down the application
 */
export const closeDatabase = async () => {
  await pool.end();
};

// Note: Only import `db` for queries, `pool` is only needed for:
// - Health checks (pool stats)
// - Graceful shutdown
// - Test utilities
