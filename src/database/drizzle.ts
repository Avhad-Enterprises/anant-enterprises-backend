import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { logger } from '../utils';
import { config, isProduction, isDevelopment } from '../utils/validateEnv';

// Import all schemas
import {
  users,
  userTypeEnum,
  genderEnum,
  userAddresses,
  addressTypeEnum,
  userPaymentMethods,
  paymentTypeEnum,
  cardFundingEnum,
  customerProfiles,
  customerAccountStatusEnum,
  customerSegmentEnum,
  businessCustomerProfiles,
  businessTypeEnum,
  paymentTermsEnum,
  businessTierEnum,
  businessAccountStatusEnum,
  adminProfiles,
  customerStatistics,
} from '../features/user';
import { uploads } from '../features/upload';
import { invitations } from '../features/admin-invite';
import { chatbotDocuments, chatbotSessions, chatbotMessages } from '../features/chatbot';
import { roles, permissions, rolePermissions, userRoles } from '../features/rbac';
import {
  currencies,
  taxRules,
  taxTypeEnum,
  taxAppliesToEnum,
  countries,
  regions,
} from '../features/settings';
import { products, productFaqs, productStatusEnum } from '../features/product';
import {
  collections,
  collectionRules,
  collectionProducts,
  collectionTypeEnum,
  collectionStatusEnum,
  collectionSortOrderEnum,
  conditionMatchTypeEnum,
} from '../features/collection';
import { tiers, productTiers, tierStatusEnum } from '../features/tiers';
import { tags, productTags } from '../features/tags';
import {
  discounts,
  discountCodes,
  discountProducts,
  discountCollections,
  discountTypeEnum,
  discountStatusEnum,
  minRequirementTypeEnum,
} from '../features/discount';
import { wishlists, wishlistItems } from '../features/wishlist';
import { faqs, faqTargetTypeEnum } from '../features/faq';
import {
  companies,
  companyRules,
  userAssignmentTypeEnum,
  companyMatchTypeEnum,
} from '../features/company';
import {
  catalogues,
  catalogueRules,
  catalogueProductOverrides,
  catalogueStatusEnum,
  catalogueRuleMatchTypeEnum,
  catalogueAdjustmentTypeEnum,
} from '../features/catalogue';
import { blogs, blogSubsections, blogStatusEnum } from '../features/blog';
import {
  reviews,
  productQuestions,
  reviewStatusEnum,
  questionStatusEnum,
} from '../features/reviews';
import { bundles, bundleItems, bundleTypeEnum, bundleStatusEnum } from '../features/bundles';
import {
  giftCards,
  giftCardTransactions,
  giftCardTemplates,
  giftCardStatusEnum,
  giftCardDeliveryMethodEnum,
  giftCardSourceEnum,
  giftCardTransactionTypeEnum,
  giftCardCharacterSetEnum,
} from '../features/giftcards';
import {
  inventoryLocations,
  inventory,
  inventoryAdjustments,
  productionOrders,
  locationTypeEnum,
  inventoryStatusEnum,
  adjustmentTypeEnum,
  approvalStatusEnum,
  productionStatusEnum,
  productionPriorityEnum,
} from '../features/inventory';
import { carts, cartItems, cartStatusEnum, cartSourceEnum } from '../features/cart';
import {
  tickets,
  ticketMessages,
  ticketPriorityEnum,
  ticketStatusEnum,
  ticketChannelEnum,
  ticketSourceEnum,
  ticketMessageSenderTypeEnum,
} from '../features/tickets';
import {
  orders,
  orderItems,
  orderChannelEnum,
  paymentStatusEnum,
  orderDiscountTypeEnum,
  fulfillmentStatusEnum,
} from '../features/orders';
import {
  paymentTransactions,
  paymentTransactionStatusEnum,
  paymentWebhookLogs,
} from '../features/payments/shared';

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
  userTypeEnum,
  genderEnum,
  // User feature - addresses
  userAddresses,
  addressTypeEnum,
  // User feature - payments
  userPaymentMethods,
  paymentTypeEnum,
  cardFundingEnum,
  // User feature - customer profiles
  customerProfiles,
  customerAccountStatusEnum,
  customerSegmentEnum,
  // User feature - business profiles (B2B)
  businessCustomerProfiles,
  businessTypeEnum,
  paymentTermsEnum,
  businessTierEnum,
  businessAccountStatusEnum,
  // User feature - admin profiles
  adminProfiles,
  // User feature - vendors (TODO: Enable when vendor feature is needed)
  // vendors,
  // vendorTypeEnum,
  // User feature - statistics
  customerStatistics,
  // Upload feature
  uploads,
  // Admin invite feature
  invitations,
  // Chatbot feature
  chatbotDocuments,
  chatbotSessions,
  chatbotMessages,
  // RBAC feature
  roles,
  permissions,
  rolePermissions,
  userRoles,
  // Settings feature
  currencies,
  taxRules,
  taxTypeEnum,
  taxAppliesToEnum,
  countries,
  regions,
  // Product feature
  products,
  productFaqs,
  productStatusEnum,
  // Collection feature
  collections,
  collectionRules,
  collectionProducts,
  collectionTypeEnum,
  collectionStatusEnum,
  collectionSortOrderEnum,
  conditionMatchTypeEnum,
  // Tier feature
  tiers,
  productTiers,
  tierStatusEnum,
  // Tags feature
  tags,
  productTags,
  // Discount feature
  discounts,
  discountCodes,
  discountProducts,
  discountCollections,
  discountTypeEnum,
  discountStatusEnum,
  minRequirementTypeEnum,
  // Wishlist feature
  wishlists,
  wishlistItems,
  // FAQ feature
  faqs,
  faqTargetTypeEnum,
  // Company feature
  companies,
  companyRules,
  userAssignmentTypeEnum,
  companyMatchTypeEnum,
  // Catalogue feature
  catalogues,
  catalogueRules,
  catalogueProductOverrides,
  catalogueStatusEnum,
  catalogueRuleMatchTypeEnum,
  catalogueAdjustmentTypeEnum,
  // Blog feature
  blogs,
  blogSubsections,
  blogStatusEnum,
  // Review feature
  reviews,
  productQuestions,
  reviewStatusEnum,
  questionStatusEnum,
  // Bundle feature
  bundles,
  bundleItems,
  bundleTypeEnum,
  bundleStatusEnum,
  // Gift Card feature
  giftCards,
  giftCardTransactions,
  giftCardTemplates,
  giftCardStatusEnum,
  giftCardDeliveryMethodEnum,
  giftCardSourceEnum,
  giftCardTransactionTypeEnum,
  giftCardCharacterSetEnum,
  // Inventory feature
  inventoryLocations,
  inventory,
  inventoryAdjustments,
  productionOrders,
  locationTypeEnum,
  inventoryStatusEnum,
  adjustmentTypeEnum,
  approvalStatusEnum,
  productionStatusEnum,
  productionPriorityEnum,
  // Cart feature
  carts,
  cartItems,
  cartStatusEnum,
  cartSourceEnum,
  // Tickets feature
  tickets,
  ticketMessages,
  ticketPriorityEnum,
  ticketStatusEnum,
  ticketChannelEnum,
  ticketSourceEnum,
  ticketMessageSenderTypeEnum,
  // Orders feature
  orders,
  orderItems,
  orderChannelEnum,
  paymentStatusEnum,
  orderDiscountTypeEnum,
  fulfillmentStatusEnum,
  // Payments feature
  paymentTransactions,
  paymentTransactionStatusEnum,
  paymentWebhookLogs,
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
