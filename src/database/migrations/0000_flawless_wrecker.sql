CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."customer_account_status" AS ENUM('active', 'inactive', 'banned');--> statement-breakpoint
CREATE TYPE "public"."customer_segment" AS ENUM('new', 'regular', 'vip', 'at_risk');--> statement-breakpoint
CREATE TYPE "public"."business_account_status" AS ENUM('pending', 'active', 'inactive', 'banned');--> statement-breakpoint
CREATE TYPE "public"."business_tier" AS ENUM('standard', 'silver', 'gold', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('sole_proprietor', 'partnership', 'llc', 'corporation', 'nonprofit');--> statement-breakpoint
CREATE TYPE "public"."payment_terms" AS ENUM('immediate', 'net_15', 'net_30', 'net_60', 'net_90');--> statement-breakpoint
CREATE TYPE "public"."address_label" AS ENUM('home', 'office', 'warehouse', 'other');--> statement-breakpoint
CREATE TYPE "public"."card_funding" AS ENUM('credit', 'debit', 'prepaid');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('card', 'upi', 'netbanking', 'wallet');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."collection_sort_order" AS ENUM('best-selling', 'price-asc', 'price-desc', 'manual', 'created-desc', 'created-asc');--> statement-breakpoint
CREATE TYPE "public"."collection_status" AS ENUM('active', 'inactive', 'draft');--> statement-breakpoint
CREATE TYPE "public"."collection_type" AS ENUM('manual', 'automated');--> statement-breakpoint
CREATE TYPE "public"."condition_match_type" AS ENUM('all', 'any');--> statement-breakpoint
CREATE TYPE "public"."tier_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('pending', 'answered', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('warehouse', 'factory', 'store', 'transit');--> statement-breakpoint
CREATE TYPE "public"."inventory_condition" AS ENUM('sellable', 'damaged', 'quarantined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('in_stock', 'low_stock', 'out_of_stock');--> statement-breakpoint
CREATE TYPE "public"."adjustment_type" AS ENUM('increase', 'decrease', 'correction', 'write-off');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."cart_source" AS ENUM('web', 'app');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('active', 'converted', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('unfulfilled', 'partial', 'fulfilled', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_channel" AS ENUM('web', 'app', 'pos', 'marketplace', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_discount_type" AS ENUM('percent', 'amount', 'none');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'refunded', 'failed', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_status" AS ENUM('initiated', 'authorized', 'captured', 'failed', 'refund_initiated', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."notification_frequency" AS ENUM('immediate', 'daily_digest', 'weekly_digest', 'never');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('order_created', 'order_paid', 'order_shipped', 'order_delivered', 'order_cancelled', 'payment_authorized', 'payment_captured', 'payment_failed', 'payment_refunded', 'inventory_low_stock', 'inventory_out_of_stock', 'inventory_restocked', 'user_welcome', 'account_updated', 'password_changed', 'admin_broadcast', 'system_alert', 'promotion', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."blog_status" AS ENUM('public', 'private', 'draft');--> statement-breakpoint
CREATE TYPE "public"."segment_match_type" AS ENUM('all', 'any');--> statement-breakpoint
CREATE TYPE "public"."segment_priority" AS ENUM('critical', 'high', 'normal', 'low');--> statement-breakpoint
CREATE TYPE "public"."segment_purpose" AS ENUM('marketing-campaign', 'email-campaign', 'sms-campaign', 'loyalty-program', 'risk-management', 'analytics');--> statement-breakpoint
CREATE TYPE "public"."segment_type" AS ENUM('manual', 'automated');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"auth_id" uuid,
	"display_id" varchar(20),
	"first_name" varchar(255) NOT NULL,
	"middle_name" varchar(255),
	"last_name" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp,
	"phone_number" varchar(20),
	"phone_country_code" varchar(5),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"phone_verified_at" timestamp,
	"secondary_email" varchar(255),
	"secondary_email_verified" boolean DEFAULT false NOT NULL,
	"secondary_phone_number" varchar(20),
	"profile_image_url" varchar(500),
	"date_of_birth" date,
	"gender" "gender",
	"tags" text[],
	"metadata" jsonb,
	"preferred_language" varchar(10) DEFAULT 'en' NOT NULL,
	"languages" text[],
	"preferred_currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "users_display_id_unique" UNIQUE("display_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"employee_id" varchar(50),
	"department" varchar(100),
	"job_title" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "admin_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "admin_profiles_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"segments" text[] DEFAULT ARRAY['new']::text[] NOT NULL,
	"store_credit_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"referral_code" varchar(20),
	"referred_by_user_id" uuid,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"email_opt_in" boolean DEFAULT true NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"push_notifications_opt_in" boolean DEFAULT true NOT NULL,
	"account_status" "customer_account_status" DEFAULT 'active' NOT NULL,
	"banned_reason" text,
	"banned_until" timestamp,
	"risk_profile" varchar(20) DEFAULT 'low',
	"loyalty_enrolled" boolean DEFAULT false NOT NULL,
	"loyalty_tier" varchar(50),
	"loyalty_points" numeric(12, 2) DEFAULT '0',
	"loyalty_enrollment_date" timestamp,
	"subscription_plan" varchar(100),
	"subscription_status" varchar(20),
	"billing_cycle" varchar(20),
	"subscription_start_date" timestamp,
	"auto_renew" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "customer_profiles_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "customer_statistics" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"completed_orders" integer DEFAULT 0 NOT NULL,
	"cancelled_orders" integer DEFAULT 0 NOT NULL,
	"returned_orders" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"average_order_value" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"highest_order_value" numeric(12, 2),
	"first_order_at" timestamp,
	"last_order_at" timestamp,
	"days_since_last_order" integer,
	"favorite_category_id" integer,
	"favorite_brand_id" integer,
	"cart_abandonment_count" integer DEFAULT 0 NOT NULL,
	"wishlist_items_count" integer DEFAULT 0 NOT NULL,
	"support_tickets_count" integer DEFAULT 0 NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"average_review_rating" numeric(3, 2),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_statistics_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "business_customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_type" "business_type" NOT NULL,
	"company_legal_name" varchar(255) NOT NULL,
	"company_trade_name" varchar(255),
	"company_registration_number" varchar(100),
	"industry" varchar(100),
	"website" varchar(255),
	"tax_id" varchar(50),
	"tax_exempt" boolean DEFAULT false NOT NULL,
	"tax_exemption_certificate_url" varchar(500),
	"business_email" varchar(255) NOT NULL,
	"business_phone" varchar(20),
	"business_phone_country_code" varchar(5),
	"billing_address_id" uuid,
	"shipping_address_id" uuid,
	"payment_terms" "payment_terms" DEFAULT 'immediate' NOT NULL,
	"credit_limit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"credit_approved_by" uuid,
	"credit_approved_at" timestamp,
	"account_manager_id" uuid,
	"tier" "business_tier" DEFAULT 'standard' NOT NULL,
	"bulk_discount_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"minimum_order_value" numeric(12, 2),
	"account_status" "business_account_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"banned_reason" text,
	"banned_until" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_customer_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"address_label" "address_label" DEFAULT 'home' NOT NULL,
	"is_default_shipping" boolean DEFAULT false NOT NULL,
	"is_default_billing" boolean DEFAULT false NOT NULL,
	"recipient_name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"phone_number" varchar(20),
	"phone_country_code" varchar(5),
	"address_line1" varchar(255) NOT NULL,
	"address_line2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state_province" varchar(100) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country" varchar(100) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"delivery_instructions" text,
	"is_international" boolean DEFAULT false NOT NULL,
	"tax_id" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"payment_type" "payment_type" NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"razorpay_customer_id" varchar(100),
	"razorpay_token_id" varchar(100),
	"display_name" varchar(100),
	"card_last4" varchar(4),
	"card_brand" varchar(20),
	"card_network" varchar(20),
	"card_type" "card_funding",
	"card_issuer" varchar(100),
	"card_exp_month" integer,
	"card_exp_year" integer,
	"upi_id" varchar(100),
	"wallet_type" varchar(50),
	"netbanking_bank_code" varchar(20),
	"netbanking_bank_name" varchar(100),
	"billing_address_id" uuid,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_system_role" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(100) NOT NULL,
	"resource" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"invite_token" varchar(64) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_role_id" uuid,
	"temp_password_encrypted" text,
	"password_hash" varchar(255),
	"verify_attempts" integer DEFAULT 0 NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "invitation_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"product_title" varchar(255) NOT NULL,
	"secondary_title" varchar(255),
	"short_description" text,
	"full_description" text,
	"admin_comment" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"cost_price" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"selling_price" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"compare_at_price" numeric(15, 2),
	"sku" varchar(100) NOT NULL,
	"hsn_code" varchar(20),
	"barcode" varchar(50),
	"weight" numeric(8, 2),
	"length" numeric(8, 2),
	"breadth" numeric(8, 2),
	"height" numeric(8, 2),
	"category_tier_1" uuid,
	"category_tier_2" uuid,
	"category_tier_3" uuid,
	"category_tier_4" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"primary_image_url" text,
	"thumbnail_url" text,
	"additional_images" jsonb DEFAULT '[]'::jsonb,
	"additional_thumbnails" jsonb DEFAULT '[]'::jsonb,
	"has_variants" boolean DEFAULT false NOT NULL,
	"meta_title" varchar(255),
	"meta_description" text,
	"product_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', 
                    COALESCE(product_title, '') || ' ' || 
                    COALESCE(short_description, '')
                )) STORED,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_cost_price_check" CHECK (cost_price >= 0),
	CONSTRAINT "products_selling_price_check" CHECK (selling_price >= 0),
	CONSTRAINT "products_compare_at_price_check" CHECK (compare_at_price IS NULL OR compare_at_price >= selling_price)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"option_name" varchar(100) NOT NULL,
	"option_value" varchar(100) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(50),
	"cost_price" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"selling_price" numeric(15, 2) NOT NULL,
	"compare_at_price" numeric(15, 2),
	"image_url" text,
	"thumbnail_url" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "uq_variant_option" UNIQUE("product_id","option_name","option_value"),
	CONSTRAINT "product_variants_cost_price_check" CHECK (cost_price >= 0),
	CONSTRAINT "product_variants_selling_price_check" CHECK (selling_price >= 0),
	CONSTRAINT "product_variants_compare_at_price_check" CHECK (compare_at_price IS NULL OR compare_at_price >= selling_price)
);
--> statement-breakpoint
CREATE TABLE "product_faqs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"product_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"type" "collection_type" DEFAULT 'manual' NOT NULL,
	"status" "collection_status" DEFAULT 'draft' NOT NULL,
	"sort_order" "collection_sort_order" DEFAULT 'manual' NOT NULL,
	"condition_match_type" "condition_match_type" DEFAULT 'all',
	"banner_image_url" text,
	"mobile_banner_image_url" text,
	"meta_title" varchar(255),
	"meta_description" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"published_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "collection_products" (
	"collection_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "collection_products_collection_id_product_id_pk" PRIMARY KEY("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "tiers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"description" text,
	"level" integer NOT NULL,
	"parent_id" uuid,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" "tier_status" DEFAULT 'active' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "tiers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'product' NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(255),
	"comment" text,
	"media_urls" jsonb DEFAULT '[]'::jsonb,
	"is_verified_purchase" boolean DEFAULT false NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"admin_reply" text,
	"helpful_votes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "reviews_rating_check" CHECK (rating >= 1 AND rating <= 5)
);
--> statement-breakpoint
CREATE TABLE "product_questions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"answered_by" uuid,
	"status" "question_status" DEFAULT 'pending' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" varchar(255),
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"wishlist_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"notes" text,
	"added_to_cart_at" timestamp,
	"purchased_at" timestamp,
	"order_id" uuid,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_items_wishlist_id_product_id_pk" PRIMARY KEY("wishlist_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_locations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"location_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "location_type" NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"postal_code" varchar(20),
	"contact_person" varchar(255),
	"phone_number" varchar(20),
	"email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "inventory_locations_location_code_unique" UNIQUE("location_code"),
	CONSTRAINT "inventory_locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"location_id" uuid NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"incoming_quantity" integer DEFAULT 0 NOT NULL,
	"incoming_po_reference" varchar(100),
	"incoming_eta" timestamp,
	"condition" "inventory_condition" DEFAULT 'sellable' NOT NULL,
	"status" "inventory_status" DEFAULT 'in_stock' NOT NULL,
	"total_sold" integer DEFAULT 0 NOT NULL,
	"total_fulfilled" integer DEFAULT 0 NOT NULL,
	"last_stock_movement_at" timestamp,
	"last_sale_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "uq_inventory_product_variant_location" UNIQUE("product_id","variant_id","location_id"),
	CONSTRAINT "inventory_available_qty_check" CHECK (available_quantity >= 0),
	CONSTRAINT "inventory_reserved_qty_check" CHECK (reserved_quantity >= 0),
	CONSTRAINT "inventory_incoming_qty_check" CHECK (incoming_quantity >= 0),
	CONSTRAINT "inventory_total_sold_check" CHECK (total_sold >= 0),
	CONSTRAINT "inventory_total_fulfilled_check" CHECK (total_fulfilled >= 0),
	CONSTRAINT "inventory_product_or_variant_check" CHECK ((product_id IS NOT NULL AND variant_id IS NULL) OR (product_id IS NULL AND variant_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "inventory_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"adjustment_type" "adjustment_type" NOT NULL,
	"quantity_change" integer NOT NULL,
	"reason" varchar(500) NOT NULL,
	"reference_number" varchar(100),
	"quantity_before" integer NOT NULL,
	"quantity_after" integer NOT NULL,
	"adjusted_by" uuid NOT NULL,
	"adjusted_at" timestamp DEFAULT now() NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"approval_status" "approval_status" DEFAULT 'approved' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid,
	"session_id" varchar(100),
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"giftcard_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"shipping_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"applied_discount_codes" jsonb DEFAULT '[]'::jsonb,
	"applied_giftcard_codes" jsonb DEFAULT '[]'::jsonb,
	"cart_status" "cart_status" DEFAULT 'active' NOT NULL,
	"source" "cart_source" DEFAULT 'web' NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"abandoned_at" timestamp,
	"recovery_email_sent" boolean DEFAULT false NOT NULL,
	"recovery_email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"bundle_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"final_price" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_subtotal" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"product_name" varchar(255),
	"product_image_url" text,
	"product_sku" varchar(100),
	"customization_data" jsonb DEFAULT '{}'::jsonb,
	"reserved_from_location_id" uuid,
	"reserved_at" timestamp,
	"reservation_id" uuid,
	"reservation_expires_at" timestamp,
	"bundle_snapshot" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "cart_items_quantity_check" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"order_number" varchar(40) NOT NULL,
	"user_id" uuid,
	"cart_id" uuid,
	"shipping_address_id" uuid,
	"billing_address_id" uuid,
	"channel" "order_channel" DEFAULT 'web' NOT NULL,
	"order_status" "order_status" DEFAULT 'pending' NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"payment_method" varchar(60),
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_ref" varchar(120),
	"transaction_id" varchar(120),
	"paid_at" timestamp,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"razorpay_order_id" varchar(50),
	"payment_link_expires_at" timestamp,
	"payment_attempts" integer DEFAULT 0 NOT NULL,
	"last_payment_error" varchar(500),
	"subtotal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_id" uuid,
	"discount_code_id" varchar(50),
	"discount_type" "order_discount_type" DEFAULT 'none' NOT NULL,
	"discount_value" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_code" varchar(80),
	"giftcard_code" varchar(80),
	"giftcard_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"shipping_method" varchar(120),
	"shipping_option" varchar(120),
	"shipping_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"delivery_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"partial_cod_charges" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"advance_paid_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"cod_due_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_rule_id" uuid,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"cgst" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sgst" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"igst" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_quantity" integer DEFAULT 0 NOT NULL,
	"fulfillment_status" "fulfillment_status" DEFAULT 'unfulfilled' NOT NULL,
	"fulfillment_date" timestamp,
	"delivery_date" timestamp,
	"return_date" timestamp,
	"return_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"order_tracking" varchar(200),
	"customer_gstin" varchar(20),
	"is_international_order" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"customer_note" varchar(500),
	"admin_comment" varchar(500),
	"amz_order_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"sku" varchar(100),
	"product_name" varchar(255) NOT NULL,
	"product_image" text,
	"cost_price" numeric(12, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"quantity_fulfilled" integer DEFAULT 0 NOT NULL,
	"quantity_cancelled" integer DEFAULT 0 NOT NULL,
	"quantity_returned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_check" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"order_id" uuid NOT NULL,
	"razorpay_order_id" varchar(50) NOT NULL,
	"razorpay_payment_id" varchar(50),
	"razorpay_signature" varchar(256),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "payment_transaction_status" DEFAULT 'initiated' NOT NULL,
	"payment_method" varchar(50),
	"payment_method_details" jsonb,
	"error_code" varchar(50),
	"error_description" varchar(500),
	"error_source" varchar(50),
	"error_step" varchar(50),
	"error_reason" varchar(200),
	"refund_id" varchar(50),
	"refund_amount" numeric(12, 2),
	"refund_reason" varchar(200),
	"refunded_at" timestamp,
	"webhook_verified" boolean DEFAULT false NOT NULL,
	"webhook_received_at" timestamp,
	"idempotency_key" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp,
	CONSTRAINT "payment_transactions_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_tx_valid_amount" CHECK (amount > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"event_id" varchar(100),
	"event_type" varchar(100) NOT NULL,
	"razorpay_order_id" varchar(50),
	"razorpay_payment_id" varchar(50),
	"raw_payload" jsonb NOT NULL,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp,
	"processing_error" varchar(500),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_webhook_logs_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
	"priority" "notification_priority" DEFAULT 'normal' NOT NULL,
	"action_url" varchar(500),
	"action_text" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50),
	"subject" varchar(255),
	"body_text" text,
	"body_html" text,
	"sms_template" text,
	"in_app_title" varchar(255),
	"in_app_message" text,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_type" "notification_type" NOT NULL,
	"channel_email" boolean DEFAULT true NOT NULL,
	"channel_sms" boolean DEFAULT false NOT NULL,
	"channel_in_app" boolean DEFAULT true NOT NULL,
	"channel_push" boolean DEFAULT true NOT NULL,
	"frequency" "notification_frequency" DEFAULT 'immediate' NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_delivery_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" varchar(50) NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"recipient" varchar(255),
	"provider" varchar(100),
	"provider_message_id" varchar(255),
	"provider_response" jsonb,
	"error_message" text,
	"error_code" varchar(50),
	"retry_count" integer DEFAULT 0,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blogs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"title" varchar(255) NOT NULL,
	"quote" varchar(500),
	"description" varchar(150),
	"content" text,
	"slug" varchar(255) NOT NULL,
	"main_image_pc_url" text,
	"main_image_mobile_url" text,
	"admin_comment" text,
	"category" varchar(100),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"author" varchar(255),
	"meta_title" varchar(60),
	"meta_description" varchar(160),
	"status" "blog_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"views_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "blogs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_subsections" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"blog_id" uuid NOT NULL,
	"title" varchar(255),
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" bigint NOT NULL,
	"file_path" text NOT NULL,
	"file_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"user_email" varchar(255),
	"user_role" varchar(100),
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" varchar(255),
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar(255),
	"metadata" jsonb,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_code" varchar(6) NOT NULL,
	"purpose" varchar(50) DEFAULT 'email_verification' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_segment_members" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"segment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by" uuid
);
--> statement-breakpoint
CREATE TABLE "customer_segment_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"segment_id" uuid NOT NULL,
	"field" varchar(100) NOT NULL,
	"condition" varchar(50) NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"purpose" "segment_purpose" DEFAULT 'marketing-campaign' NOT NULL,
	"priority" "segment_priority" DEFAULT 'normal' NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"type" "segment_type" DEFAULT 'automated' NOT NULL,
	"match_type" "segment_match_type" DEFAULT 'all' NOT NULL,
	"admin_comment" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "customer_segments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_statistics" ADD CONSTRAINT "customer_statistics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_billing_address_id_user_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_shipping_address_id_user_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_credit_approved_by_users_id_fk" FOREIGN KEY ("credit_approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_account_manager_id_users_id_fk" FOREIGN KEY ("account_manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_billing_address_id_user_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_1_tiers_id_fk" FOREIGN KEY ("category_tier_1") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_2_tiers_id_fk" FOREIGN KEY ("category_tier_2") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_3_tiers_id_fk" FOREIGN KEY ("category_tier_3") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_4_tiers_id_fk" FOREIGN KEY ("category_tier_4") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_faqs" ADD CONSTRAINT "product_faqs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_adjusted_by_users_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_reserved_from_location_id_inventory_locations_id_fk" FOREIGN KEY ("reserved_from_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_user_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_address_id_user_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_logs" ADD CONSTRAINT "notification_delivery_logs_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_subsections" ADD CONSTRAINT "blog_subsections_blog_id_blogs_id_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segment_members" ADD CONSTRAINT "customer_segment_members_segment_id_customer_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."customer_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segment_members" ADD CONSTRAINT "customer_segment_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segment_rules" ADD CONSTRAINT "customer_segment_rules_segment_id_customer_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."customer_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_email_is_deleted_idx" ON "users" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_auth_id_idx" ON "users" USING btree ("auth_id");--> statement-breakpoint
CREATE INDEX "users_display_id_idx" ON "users" USING btree ("display_id");--> statement-breakpoint
CREATE INDEX "users_email_verified_idx" ON "users" USING btree ("email_verified","is_deleted");--> statement-breakpoint
CREATE INDEX "admin_profiles_department_idx" ON "admin_profiles" USING btree ("department","is_active");--> statement-breakpoint
CREATE INDEX "admin_profiles_is_active_idx" ON "admin_profiles" USING btree ("is_active","is_deleted");--> statement-breakpoint
CREATE INDEX "admin_profiles_employee_id_idx" ON "admin_profiles" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "customer_profiles_referral_code_idx" ON "customer_profiles" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "customer_profiles_status_idx" ON "customer_profiles" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "customer_profiles_risk_idx" ON "customer_profiles" USING btree ("risk_profile");--> statement-breakpoint
CREATE INDEX "customer_stats_updated_at_idx" ON "customer_statistics" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "customer_stats_total_spent_idx" ON "customer_statistics" USING btree ("total_spent");--> statement-breakpoint
CREATE INDEX "customer_stats_total_orders_idx" ON "customer_statistics" USING btree ("total_orders");--> statement-breakpoint
CREATE INDEX "business_profiles_status_idx" ON "business_customer_profiles" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "business_profiles_tier_idx" ON "business_customer_profiles" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "business_profiles_account_manager_idx" ON "business_customer_profiles" USING btree ("account_manager_id");--> statement-breakpoint
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "user_addresses_user_default_shipping_idx" ON "user_addresses" USING btree ("user_id","is_default_shipping","is_deleted");--> statement-breakpoint
CREATE INDEX "user_addresses_user_default_billing_idx" ON "user_addresses" USING btree ("user_id","is_default_billing","is_deleted");--> statement-breakpoint
CREATE INDEX "user_addresses_country_idx" ON "user_addresses" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "user_addresses_unique_default_shipping_idx" ON "user_addresses" USING btree ("user_id") WHERE "user_addresses"."is_default_shipping" = true AND "user_addresses"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "user_addresses_unique_default_billing_idx" ON "user_addresses" USING btree ("user_id") WHERE "user_addresses"."is_default_billing" = true AND "user_addresses"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "user_payment_methods_user_id_idx" ON "user_payment_methods" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "user_payment_methods_user_default_idx" ON "user_payment_methods" USING btree ("user_id","is_default","is_deleted");--> statement-breakpoint
CREATE INDEX "user_payment_methods_razorpay_customer_idx" ON "user_payment_methods" USING btree ("razorpay_customer_id");--> statement-breakpoint
CREATE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "roles_is_active_idx" ON "roles" USING btree ("is_active","is_deleted");--> statement-breakpoint
CREATE INDEX "permissions_resource_idx" ON "permissions" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "permissions_resource_action_idx" ON "permissions" USING btree ("resource","action");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_roles_expires_at_idx" ON "user_roles" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "invitation_invite_token_idx" ON "invitation" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "invitation_email_is_deleted_idx" ON "invitation" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "invitation_status_is_deleted_idx" ON "invitation" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE INDEX "invitation_expires_at_idx" ON "invitation" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "invitation_invited_by_idx" ON "invitation" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_tier_1","category_tier_2");--> statement-breakpoint
CREATE INDEX "products_search_vector_idx" ON "products" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "products_tags_idx" ON "products" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" USING btree ("selling_price");--> statement-breakpoint
CREATE INDEX "products_category_price_status_idx" ON "products" USING btree ("category_tier_1","selling_price","status","is_deleted");--> statement-breakpoint
CREATE INDEX "products_is_deleted_idx" ON "products" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_is_deleted_idx" ON "product_variants" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "product_faqs_product_id_idx" ON "product_faqs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "collections_slug_idx" ON "collections" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "collections_type_idx" ON "collections" USING btree ("type");--> statement-breakpoint
CREATE INDEX "collections_status_idx" ON "collections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "collection_products_product_id_idx" ON "collection_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "tiers_parent_id_idx" ON "tiers" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "tiers_level_idx" ON "tiers" USING btree ("level");--> statement-breakpoint
CREATE INDEX "tiers_code_idx" ON "tiers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "tiers_status_idx" ON "tiers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tags_type_idx" ON "tags" USING btree ("type");--> statement-breakpoint
CREATE INDEX "reviews_product_id_idx" ON "reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "reviews_user_id_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_rating_idx" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "product_questions_product_id_idx" ON "product_questions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_questions_status_idx" ON "product_questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wishlists_user_id_idx" ON "wishlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wishlists_access_token_idx" ON "wishlists" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "wishlist_items_product_id_idx" ON "wishlist_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_locations_code_idx" ON "inventory_locations" USING btree ("location_code");--> statement-breakpoint
CREATE INDEX "inventory_locations_type_active_idx" ON "inventory_locations" USING btree ("type","is_active");--> statement-breakpoint
CREATE INDEX "inventory_locations_default_idx" ON "inventory_locations" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "inventory_product_idx" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_variant_idx" ON "inventory" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "inventory_status_idx" ON "inventory" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_condition_idx" ON "inventory" USING btree ("condition");--> statement-breakpoint
CREATE INDEX "inventory_location_id_idx" ON "inventory" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "inventory_product_location_idx" ON "inventory" USING btree ("product_id","location_id");--> statement-breakpoint
CREATE INDEX "inventory_variant_location_idx" ON "inventory" USING btree ("variant_id","location_id");--> statement-breakpoint
CREATE INDEX "inventory_last_sale_idx" ON "inventory" USING btree ("last_sale_at");--> statement-breakpoint
CREATE INDEX "inventory_last_movement_idx" ON "inventory" USING btree ("last_stock_movement_at");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_inventory_adjusted_idx" ON "inventory_adjustments" USING btree ("inventory_id","adjusted_at");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_adjusted_by_idx" ON "inventory_adjustments" USING btree ("adjusted_by");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_type_idx" ON "inventory_adjustments" USING btree ("adjustment_type");--> statement-breakpoint
CREATE INDEX "carts_user_id_idx" ON "carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "carts_session_id_idx" ON "carts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "carts_status_activity_idx" ON "carts" USING btree ("cart_status","last_activity_at");--> statement-breakpoint
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "cart_items_product_id_idx" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "cart_items_bundle_id_idx" ON "cart_items" USING btree ("bundle_id");--> statement-breakpoint
CREATE INDEX "idx_cart_items_cart_id" ON "cart_items" USING btree ("cart_id") WHERE is_deleted = false;--> statement-breakpoint
CREATE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_is_draft_idx" ON "orders" USING btree ("is_draft");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "orders_fulfillment_status_idx" ON "orders" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_draft_payment_idx" ON "orders" USING btree ("is_draft","payment_status");--> statement-breakpoint
CREATE INDEX "orders_razorpay_order_id_idx" ON "orders" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_user_status" ON "orders" USING btree ("user_id","order_status") WHERE is_deleted = false;--> statement-breakpoint
CREATE INDEX "idx_orders_status_dates" ON "orders" USING btree ("order_status","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "payment_tx_order_id_idx" ON "payment_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_tx_rp_order_id_idx" ON "payment_transactions" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "payment_tx_rp_payment_id_idx" ON "payment_transactions" USING btree ("razorpay_payment_id");--> statement-breakpoint
CREATE INDEX "payment_tx_status_idx" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_tx_created_at_idx" ON "payment_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_logs_event_type_idx" ON "payment_webhook_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_logs_rp_order_idx" ON "payment_webhook_logs" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_rp_payment_idx" ON "payment_webhook_logs" USING btree ("razorpay_payment_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_processed_idx" ON "payment_webhook_logs" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "webhook_logs_received_at_idx" ON "payment_webhook_logs" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "blogs_slug_idx" ON "blogs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blogs_status_idx" ON "blogs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blogs_category_idx" ON "blogs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "blog_subsections_blog_id_idx" ON "blog_subsections" USING btree ("blog_id");--> statement-breakpoint
CREATE INDEX "uploads_user_id_is_deleted_idx" ON "uploads" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "uploads_status_idx" ON "uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "uploads_mime_type_idx" ON "uploads" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "uploads_created_at_idx" ON "uploads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_timestamp" ON "audit_logs" USING btree ("user_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "email_otps_email_idx" ON "email_otps" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_otps_expires_at_idx" ON "email_otps" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "customer_segment_members_segment_user_idx" ON "customer_segment_members" USING btree ("segment_id","user_id");--> statement-breakpoint
CREATE INDEX "customer_segment_rules_segment_id_idx" ON "customer_segment_rules" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "customer_segments_name_idx" ON "customer_segments" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customer_segments_code_idx" ON "customer_segments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "customer_segments_status_idx" ON "customer_segments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_segments_type_idx" ON "customer_segments" USING btree ("type");