import knex from "knex";
import dotenv from "dotenv";

dotenv.config();

const awsConf = {
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: 5432,
    // ssl: {
    //   rejectUnauthorized: false
    // },

  },
  searchPath: "public",
};

const DB = knex(awsConf);

export default DB;

// Table Names
import { USERS_TABLE } from "./user.schema";
import { COLLECTIONS } from "./collection.schema";
import { PRODUCT_TABLE } from "./product.schema";
import { FAQ } from "./faq.schema";
import { SIZES_TABLE } from "./size.schema";
import { ACCESSORIES_TABLE } from "./accessory.schema";
import { PICKUP_LOCATIONS } from "./pickup_locations.schema";
import { PINCODE_MAPPING } from "./pincode_mapping.schema";
import { WISHLIST_TABLE } from "./wishlist.schema";
import { COLLECTION_PRODUCTS } from "./collection_products.schema";
import { ORDERS_ITEMS } from "./order_item.schema";
import { DISCOUNTS } from "./discount.schema";
import { DISCOUNT_CODE } from "./discount_code.schema";
import { GIFT_CARD } from "./giftCard.schema";
import { GIFTCARDCODE } from "./giftcardCode.schema";
import { GIFTCARD_transaction } from "./giftcard_transactions.schema";
import { BLOG_SUBSECTIONS } from "./blog_subsections.schema";
import { TIER_1 } from "./tier1.schema";
import { TIER_2 } from "./tier2.schema";
import { TIER_3 } from "./tier3.schema";
import { TIER_4 } from "./tier4.schema";
import { CART } from "./cart.schema";
import { CARTITEMS } from "./cartitems.schema";
import { TICKETS } from "./tickets.schema";
import { TICKET_MESSAGES } from "./ticket_message.schema";
import { MACRO } from "./macro.schema";
import { CUSTOMER_SEGMENTS } from "./customersegments.schema";
import { EXPORT_SYSTEM } from "./exportsystem.schema";
import { ROLE } from "./role.schema";
import { PERMISSION } from "./permission.schema";
import { ROLE_PERMISSION } from "./role_permission.schema";
import { SEGMENT_USERS } from "./segment_user.schema";
import { CUSTOMIZATION_GROUPS } from "./customizationgroup.schema";
import { CUSTOMIZATION_OPTIONS } from "./customizationoption.schema";
import { CUSTOMIZATION_GROUP_OPTIONS } from "./group_options.schema";
import { PRODUCT_CUSTOMIZATION_GROUPS } from "./product_groups.schema";
import { CATALOGUES } from "./catalogues.schema";
import { CATALOGUE_PRODUCT_RULE } from "./catalogue_product_rules.schema";
import { COMPANY } from "./company.schema";
import { COMPANY_USER } from "./company_user.schema";
import { VISITOR_SESSIONS } from "./visitor_sessions.schema"
import { VISITOR_DEVICES } from "./visitor_devices.schema"
import { VISITOR_LOGS } from "./visitor_logs.schema"
import { AFFILIATE_LINKS } from "./affiliate_links.schema"
import { ADDRESS } from "./address.schema";
import { BLOG } from "./blogs.schema";
import { BRANDING_ASSETS } from "./branding_assets.schema";
import { CATEGORY } from "./category.schema";
import { PRODUCT_INVENTORY } from "./product_inventory.schema";
import { INVENTORY_LOCATIONS } from "./inventory_location.schema";
import { INVENTORY_TRANSFERS } from "./inventory_transfers.schema";
import { ORDERS } from "./orders.schema";
import { Bundle_items } from "./bundle_items.schema";
import { PRODUCT_BUNDLES } from "./product_bundles.schema";
import { PRODUCT_REVIEWS } from "./product_review.schema";
import { USER_ROLES } from "./user_role.schema";
import { REPORT_TEMPLATES } from "./report_templates.schema";
import { ROBOTS_TXT } from "./robot.txt.schema";
import { EMAIL_LOG_TABLE } from "./email_log.schema";
import { TAGS_TABLE } from "./tags.schema";
import { SHIPPING_SETTINGS } from "./shipping_settings.schema";
import { PRODUCT_CUSTOMIZATION_MAPPING } from "./product_customization_mapping.schema";

// Table Names
export const T = {
  COLLECTIONS,
  PRODUCT_TABLE,
  FAQ,
  SIZES_TABLE,
  ACCESSORIES_TABLE,
  PICKUP_LOCATIONS,
  USERS_TABLE,
  PINCODE_MAPPING,
  WISHLIST_TABLE,
  COLLECTION_PRODUCTS,
  ORDERS_ITEMS,
  DISCOUNTS,
  DISCOUNT_CODE,
  GIFT_CARD,
  GIFTCARD_transaction,
  GIFTCARDCODE,
  BLOG_SUBSECTIONS,
  TIER_1,
  TIER_2,
  TIER_3,
  TIER_4,
  CART,
  CARTITEMS,
  TICKETS,
  TICKET_MESSAGES,
  MACRO,
  CUSTOMER_SEGMENTS,
  EXPORT_SYSTEM,
  ROLE,
  PERMISSION,
  ROLE_PERMISSION,
  SEGMENT_USERS,
  CUSTOMIZATION_GROUPS,
  CUSTOMIZATION_OPTIONS,
  CUSTOMIZATION_GROUP_OPTIONS,
  PRODUCT_CUSTOMIZATION_GROUPS,
  COMPANY,
  CATALOGUE_PRODUCT_RULE,
  COMPANY_USER,
  VISITOR_SESSIONS,
  VISITOR_DEVICES,
  VISITOR_LOGS,
  AFFILIATE_LINKS,
  CATALOGUES,
  ADDRESS,
  BLOG,
  BRANDING_ASSETS,
  CATEGORY,
  PRODUCT_INVENTORY,
  INVENTORY_LOCATIONS,
  INVENTORY_TRANSFERS,
  ORDERS,
  PRODUCT_BUNDLES,
  Bundle_items,
  PRODUCT_REVIEWS,
  USER_ROLES,
  REPORT_TEMPLATES,
  ROBOTS_TXT,
  SHIPPING_SETTINGS,
  TAGS_TABLE,
  EMAIL_LOG_TABLE,
  PRODUCT_CUSTOMIZATION_MAPPING
};

// Creates the procedure that is then added as a trigger to every table
// Only needs to be run once on each postgres schema
export const createProcedure = async () => {
  await DB.raw(`
      CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER
      LANGUAGE plpgsql
      AS
      $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;
    `);
};

// const run = async () => {
//   createProcedure();
// };
// run();
