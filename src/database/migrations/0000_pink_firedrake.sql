CREATE TYPE "public"."blog_status" AS ENUM('public', 'private', 'draft');--> statement-breakpoint
CREATE TYPE "public"."bundle_status" AS ENUM('draft', 'active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."bundle_type" AS ENUM('fixed_price', 'percentage_discount');--> statement-breakpoint
CREATE TYPE "public"."cart_source" AS ENUM('web', 'app');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('active', 'converted', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."catalogue_adjustment_type" AS ENUM('fixed_price', 'percentage_discount', 'percentage_markup', 'fixed_discount');--> statement-breakpoint
CREATE TYPE "public"."catalogue_rule_match_type" AS ENUM('all', 'any');--> statement-breakpoint
CREATE TYPE "public"."catalogue_status" AS ENUM('active', 'inactive', 'draft');--> statement-breakpoint
CREATE TYPE "public"."collection_sort_order" AS ENUM('best-selling', 'price-asc', 'price-desc', 'manual', 'created-desc', 'created-asc');--> statement-breakpoint
CREATE TYPE "public"."collection_status" AS ENUM('active', 'inactive', 'draft');--> statement-breakpoint
CREATE TYPE "public"."collection_type" AS ENUM('manual', 'automated');--> statement-breakpoint
CREATE TYPE "public"."condition_match_type" AS ENUM('all', 'any');--> statement-breakpoint
CREATE TYPE "public"."company_match_type" AS ENUM('all', 'any');--> statement-breakpoint
CREATE TYPE "public"."company_user_assignment_type" AS ENUM('manual', 'automated');--> statement-breakpoint
CREATE TYPE "public"."buy_x_trigger_type" AS ENUM('quantity', 'amount');--> statement-breakpoint
CREATE TYPE "public"."discount_applies_to" AS ENUM('entire_order', 'specific_products', 'specific_collections');--> statement-breakpoint
CREATE TYPE "public"."discount_status" AS ENUM('active', 'inactive', 'draft', 'scheduled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y');--> statement-breakpoint
CREATE TYPE "public"."geo_restriction" AS ENUM('none', 'specific_regions');--> statement-breakpoint
CREATE TYPE "public"."get_y_applies_to" AS ENUM('same', 'specific_products', 'specific_collections', 'cheapest');--> statement-breakpoint
CREATE TYPE "public"."get_y_type" AS ENUM('free', 'percentage', 'amount', 'fixed_price');--> statement-breakpoint
CREATE TYPE "public"."discount_min_requirement_type" AS ENUM('none', 'min_amount', 'min_quantity');--> statement-breakpoint
CREATE TYPE "public"."shipping_scope" AS ENUM('all', 'specific_methods', 'specific_zones');--> statement-breakpoint
CREATE TYPE "public"."target_audience" AS ENUM('all', 'specific_customers', 'segments');--> statement-breakpoint
CREATE TYPE "public"."faq_target_type" AS ENUM('general', 'product', 'tier');--> statement-breakpoint
CREATE TYPE "public"."gift_card_character_set" AS ENUM('alphanumeric', 'alphabets', 'numbers');--> statement-breakpoint
CREATE TYPE "public"."gift_card_transaction_type" AS ENUM('issue', 'redeem', 'refund', 'adjustment', 'expiry_reversal', 'cancellation');--> statement-breakpoint
CREATE TYPE "public"."gift_card_delivery_method" AS ENUM('email', 'physical', 'instant');--> statement-breakpoint
CREATE TYPE "public"."gift_card_source" AS ENUM('purchase', 'promotion', 'refund', 'compensation', 'bulk_import');--> statement-breakpoint
CREATE TYPE "public"."gift_card_status" AS ENUM('active', 'partially_used', 'fully_redeemed', 'expired', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."adjustment_type" AS ENUM('increase', 'decrease', 'correction', 'write-off');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('warehouse', 'factory', 'store', 'transit');--> statement-breakpoint
CREATE TYPE "public"."inventory_condition" AS ENUM('sellable', 'damaged', 'quarantined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('in_stock', 'low_stock', 'out_of_stock');--> statement-breakpoint
CREATE TYPE "public"."production_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."production_status" AS ENUM('pending', 'in_progress', 'completed', 'delayed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'generated', 'sent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."invoice_version_reason" AS ENUM('INITIAL', 'CORRECTION', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('product', 'blog', 'category', 'collection', 'user', 'brand', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'video', 'document', 'file');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."notification_frequency" AS ENUM('immediate', 'daily_digest', 'weekly_digest', 'never');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('order_created', 'order_paid', 'order_shipped', 'order_delivered', 'order_cancelled', 'payment_authorized', 'payment_captured', 'payment_failed', 'payment_refunded', 'inventory_low_stock', 'inventory_out_of_stock', 'inventory_restocked', 'user_welcome', 'account_updated', 'password_changed', 'admin_broadcast', 'system_alert', 'promotion', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('unfulfilled', 'partial', 'fulfilled', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_channel" AS ENUM('web', 'app', 'pos', 'marketplace', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_discount_type" AS ENUM('percent', 'amount', 'none');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'partially_paid', 'paid', 'refunded', 'failed', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_status" AS ENUM('initiated', 'authorized', 'captured', 'failed', 'refund_initiated', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('pending', 'answered', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tax_applies_to" AS ENUM('all', 'physical_goods', 'digital_goods', 'services', 'shipping');--> statement-breakpoint
CREATE TYPE "public"."tax_type" AS ENUM('inclusive', 'exclusive');--> statement-breakpoint
CREATE TYPE "public"."ticket_message_sender_type" AS ENUM('customer', 'agent', 'system', 'note');--> statement-breakpoint
CREATE TYPE "public"."ticket_channel" AS ENUM('email', 'chat', 'whatsapp', 'phone', 'system');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_source" AS ENUM('store', 'email', 'admin', 'api');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'pending', 'waiting_customer', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."tier_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."address_type" AS ENUM('billing', 'shipping', 'both', 'company', 'other');--> statement-breakpoint
CREATE TYPE "public"."business_account_status" AS ENUM('pending', 'active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."business_tier" AS ENUM('standard', 'silver', 'gold', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('sole_proprietor', 'partnership', 'llc', 'corporation', 'nonprofit');--> statement-breakpoint
CREATE TYPE "public"."payment_terms" AS ENUM('immediate', 'net_15', 'net_30', 'net_60', 'net_90');--> statement-breakpoint
CREATE TYPE "public"."customer_account_status" AS ENUM('active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."customer_segment" AS ENUM('new', 'regular', 'vip', 'at_risk');--> statement-breakpoint
CREATE TYPE "public"."card_funding" AS ENUM('credit', 'debit', 'prepaid');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('card', 'upi', 'netbanking', 'wallet');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('individual', 'business');--> statement-breakpoint
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
CREATE TABLE "blog_subsections" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"blog_id" uuid NOT NULL,
	"title" varchar(255),
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL
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
CREATE TABLE "bundle_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"bundle_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"min_select" integer DEFAULT 0,
	"max_select" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"type" "bundle_type" DEFAULT 'fixed_price' NOT NULL,
	"status" "bundle_status" DEFAULT 'draft' NOT NULL,
	"price_value" numeric(10, 2),
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid,
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
CREATE TABLE "catalogue_product_overrides" (
	"catalogue_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"adjustment_type" "catalogue_adjustment_type" DEFAULT 'fixed_price',
	"adjustment_value" numeric(10, 2),
	"min_quantity" integer,
	"max_quantity" integer,
	"increment_step" integer DEFAULT 1,
	"is_excluded" boolean DEFAULT false NOT NULL,
	CONSTRAINT "catalogue_product_overrides_catalogue_id_product_id_pk" PRIMARY KEY("catalogue_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "catalogue_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"catalogue_id" uuid NOT NULL,
	"field" varchar(50) NOT NULL,
	"operator" varchar(50) NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogues" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "catalogue_status" DEFAULT 'draft' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp,
	"assigned_segments" jsonb DEFAULT '[]'::jsonb,
	"assigned_roles" jsonb DEFAULT '[]'::jsonb,
	"assigned_channels" jsonb DEFAULT '[]'::jsonb,
	"tier_level" varchar(50),
	"tier_value" varchar(100),
	"rule_match_type" "catalogue_rule_match_type" DEFAULT 'all' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" bigint NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"is_embedded" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "chatbot_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chatbot_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255),
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "collection_products" (
	"collection_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "collection_products_collection_id_product_id_pk" PRIMARY KEY("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "collection_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"collection_id" uuid NOT NULL,
	"field" varchar(50) NOT NULL,
	"operator" varchar(50) NOT NULL,
	"value" text NOT NULL
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "company_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"company_id" uuid NOT NULL,
	"field" varchar(50) NOT NULL,
	"operator" varchar(50) NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"gst_number" varchar(50),
	"pan_number" varchar(50),
	"address" text,
	"company_type" varchar(100),
	"user_assignment_type" "company_user_assignment_type" DEFAULT 'manual' NOT NULL,
	"match_type" "company_match_type" DEFAULT 'all',
	"status" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_buy_x_collections" (
	"discount_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	CONSTRAINT "discount_buy_x_collections_discount_id_collection_id_pk" PRIMARY KEY("discount_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "discount_buy_x_products" (
	"discount_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "discount_buy_x_products_discount_id_product_id_pk" PRIMARY KEY("discount_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "discount_customers" (
	"discount_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "discount_customers_discount_id_user_id_pk" PRIMARY KEY("discount_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "discount_exclusions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"discount_id" uuid NOT NULL,
	"exclusion_type" varchar(30) NOT NULL,
	"exclusion_value" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_get_y_collections" (
	"discount_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	CONSTRAINT "discount_get_y_collections_discount_id_collection_id_pk" PRIMARY KEY("discount_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "discount_get_y_products" (
	"discount_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "discount_get_y_products_discount_id_product_id_pk" PRIMARY KEY("discount_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "discount_regions" (
	"discount_id" uuid NOT NULL,
	"country_code" varchar(3) NOT NULL,
	"region_code" varchar(10),
	CONSTRAINT "discount_regions_discount_id_country_code_pk" PRIMARY KEY("discount_id","country_code")
);
--> statement-breakpoint
CREATE TABLE "discount_segments" (
	"discount_id" uuid NOT NULL,
	"segment_id" varchar(50) NOT NULL,
	CONSTRAINT "discount_segments_discount_id_segment_id_pk" PRIMARY KEY("discount_id","segment_id")
);
--> statement-breakpoint
CREATE TABLE "discount_shipping_methods" (
	"discount_id" uuid NOT NULL,
	"shipping_method_id" varchar(50) NOT NULL,
	CONSTRAINT "discount_shipping_methods_discount_id_shipping_method_id_pk" PRIMARY KEY("discount_id","shipping_method_id")
);
--> statement-breakpoint
CREATE TABLE "discount_shipping_zones" (
	"discount_id" uuid NOT NULL,
	"shipping_zone_id" varchar(50) NOT NULL,
	CONSTRAINT "discount_shipping_zones_discount_id_shipping_zone_id_pk" PRIMARY KEY("discount_id","shipping_zone_id")
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"code" varchar(50) PRIMARY KEY NOT NULL,
	"discount_id" uuid NOT NULL,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"max_uses_per_customer" integer,
	"allowed_user_ids" jsonb DEFAULT '[]'::jsonb,
	"allowed_email_domains" jsonb DEFAULT '[]'::jsonb,
	"required_customer_tags" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "discount_collections" (
	"discount_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	CONSTRAINT "discount_collections_discount_id_collection_id_pk" PRIMARY KEY("discount_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "discount_products" (
	"discount_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "discount_products_discount_id_product_id_pk" PRIMARY KEY("discount_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "discount_daily_usage" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"discount_id" uuid NOT NULL,
	"usage_date" timestamp NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_usage" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"discount_id" uuid,
	"discount_code" varchar(50),
	"user_id" uuid,
	"guest_email" varchar(255),
	"order_id" uuid,
	"order_number" varchar(40),
	"discount_type" varchar(30) NOT NULL,
	"discount_value" numeric(10, 2),
	"discount_amount" numeric(12, 2) NOT NULL,
	"order_subtotal" numeric(12, 2),
	"order_total" numeric(12, 2),
	"items_count" integer,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(500),
	"type" "discount_type" NOT NULL,
	"value" numeric(10, 2),
	"max_discount_amount" numeric(10, 2),
	"applies_to" "discount_applies_to" DEFAULT 'entire_order' NOT NULL,
	"min_requirement_type" "discount_min_requirement_type" DEFAULT 'none' NOT NULL,
	"min_requirement_value" numeric(10, 2),
	"buy_x_trigger_type" "buy_x_trigger_type",
	"buy_x_value" numeric(10, 2),
	"buy_x_applies_to" "discount_applies_to",
	"buy_x_same_product" boolean DEFAULT false,
	"buy_x_repeat" boolean DEFAULT true,
	"get_y_type" "get_y_type",
	"get_y_applies_to" "get_y_applies_to",
	"get_y_quantity" integer,
	"get_y_value" numeric(10, 2),
	"get_y_max_rewards" integer,
	"shipping_scope" "shipping_scope",
	"shipping_min_amount" numeric(10, 2),
	"shipping_min_items" integer,
	"shipping_cap" numeric(10, 2),
	"target_audience" "target_audience" DEFAULT 'all' NOT NULL,
	"geo_restriction" "geo_restriction" DEFAULT 'none' NOT NULL,
	"usage_limit" integer,
	"usage_per_customer" integer,
	"usage_per_day" integer,
	"usage_per_order" integer,
	"once_per_customer" boolean DEFAULT false NOT NULL,
	"limit_new_customers" boolean DEFAULT false NOT NULL,
	"limit_returning_customers" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"status" "discount_status" DEFAULT 'draft' NOT NULL,
	"total_usage_count" integer DEFAULT 0 NOT NULL,
	"total_discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_orders_count" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"admin_comment" varchar(500),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "discounts_dates_check" CHECK (ends_at IS NULL OR ends_at > starts_at),
	CONSTRAINT "discounts_value_check" CHECK (
      (type IN ('free_shipping', 'buy_x_get_y')) OR 
      (type IN ('percentage', 'fixed_amount') AND value IS NOT NULL)
    )
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"target_type" "faq_target_type" DEFAULT 'general' NOT NULL,
	"product_id" uuid,
	"tier_id" uuid,
	"section" varchar(100),
	"position" integer DEFAULT 0 NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_card_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"prefix" varchar(20),
	"suffix" varchar(20),
	"code_length" integer DEFAULT 16 NOT NULL,
	"segment_length" integer DEFAULT 4 NOT NULL,
	"separator" varchar(1) DEFAULT '-',
	"character_set" "gift_card_character_set" DEFAULT 'alphanumeric' NOT NULL,
	"include_uppercase" boolean DEFAULT true NOT NULL,
	"include_lowercase" boolean DEFAULT false NOT NULL,
	"exclude_ambiguous" boolean DEFAULT true NOT NULL,
	"default_value" numeric(10, 2),
	"default_currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"default_expiry_days" integer,
	"card_design_url" text,
	"email_template_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "gift_card_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"gift_card_id" uuid NOT NULL,
	"type" "gift_card_transaction_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_before" numeric(10, 2) NOT NULL,
	"balance_after" numeric(10, 2) NOT NULL,
	"order_id" uuid,
	"refund_id" uuid,
	"performed_by_user_id" uuid,
	"performed_by_admin_id" uuid,
	"notes" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"idempotency_key" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gift_card_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"code" varchar(50) NOT NULL,
	"pin" varchar(6),
	"initial_value" numeric(10, 2) NOT NULL,
	"current_balance" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "gift_card_status" DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"purchaser_user_id" uuid,
	"recipient_email" varchar(255),
	"recipient_name" varchar(255),
	"personal_message" text,
	"delivery_method" "gift_card_delivery_method" DEFAULT 'email',
	"delivery_scheduled_at" timestamp,
	"min_order_value" numeric(10, 2),
	"max_discount_percent" integer,
	"applicable_product_ids" jsonb DEFAULT '[]'::jsonb,
	"applicable_category_ids" jsonb DEFAULT '[]'::jsonb,
	"excluded_product_ids" jsonb DEFAULT '[]'::jsonb,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"source" "gift_card_source" DEFAULT 'purchase' NOT NULL,
	"source_order_id" uuid,
	"issued_by_admin_id" uuid,
	"template_id" uuid,
	"batch_id" uuid,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"last_failed_attempt_at" timestamp,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_reason" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "gift_cards_code_unique" UNIQUE("code")
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "inventory_locations_location_code_unique" UNIQUE("location_code"),
	CONSTRAINT "inventory_locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "inventory_transfers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"transfer_number" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"from_location_id" uuid NOT NULL,
	"to_location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"shipment_tracking" varchar(200),
	"shipped_at" timestamp,
	"received_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"reason" varchar(50),
	"notes" text,
	"related_order_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "inventory_transfers_transfer_number_unique" UNIQUE("transfer_number"),
	CONSTRAINT "transfer_different_locations" CHECK ("inventory_transfers"."from_location_id" != "inventory_transfers"."to_location_id"),
	CONSTRAINT "transfer_quantity_positive" CHECK ("inventory_transfers"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"incoming_quantity" integer DEFAULT 0 NOT NULL,
	"incoming_po_reference" varchar(100),
	"incoming_eta" timestamp,
	"condition" "inventory_condition" DEFAULT 'sellable' NOT NULL,
	"status" "inventory_status" DEFAULT 'in_stock' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_available_qty_check" CHECK (available_quantity >= 0),
	CONSTRAINT "inventory_reserved_qty_check" CHECK (reserved_quantity >= 0),
	CONSTRAINT "inventory_incoming_qty_check" CHECK (incoming_quantity >= 0)
);
--> statement-breakpoint
CREATE TABLE "location_allocation_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"rule_name" varchar(100) NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"strategy" varchar(50) DEFAULT 'nearest' NOT NULL,
	"location_ids" uuid[] NOT NULL,
	"fallback_strategy" varchar(50) DEFAULT 'any_available',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "priority_positive" CHECK ("location_allocation_rules"."priority" > 0)
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid,
	"quantity_ordered" integer NOT NULL,
	"quantity_completed" integer DEFAULT 0 NOT NULL,
	"quantity_in_progress" integer DEFAULT 0 NOT NULL,
	"quantity_rejected" integer DEFAULT 0 NOT NULL,
	"status" "production_status" DEFAULT 'pending' NOT NULL,
	"priority" "production_priority" DEFAULT 'medium' NOT NULL,
	"scheduled_start_date" date,
	"scheduled_completion_date" date,
	"actual_start_date" date,
	"actual_completion_date" date,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"estimated_hours" numeric(10, 2),
	"actual_hours" numeric(10, 2),
	"assigned_to" uuid,
	"created_by" uuid NOT NULL,
	"production_notes" text,
	"delay_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "variant_inventory_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"adjustment_type" "adjustment_type" NOT NULL,
	"quantity_change" integer NOT NULL,
	"reason" varchar(500) NOT NULL,
	"reference_number" varchar(100),
	"quantity_before" integer NOT NULL,
	"quantity_after" integer NOT NULL,
	"adjusted_by" uuid NOT NULL,
	"adjusted_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"invoice_version_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"hsn_code" varchar(8),
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) NOT NULL,
	"cgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"gstin" varchar(15),
	"billing_address" varchar(1000) NOT NULL,
	"shipping_address" varchar(1000) NOT NULL,
	"place_of_supply" varchar(100) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"shipping_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(12, 2) NOT NULL,
	"grand_total" numeric(12, 2) NOT NULL,
	"cgst" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sgst" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"igst" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_type" varchar(20) NOT NULL,
	"pdf_url" varchar(500),
	"pdf_path" varchar(500),
	"pdf_generated_at" timestamp,
	"reason" "invoice_version_reason" DEFAULT 'INITIAL' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"order_id" uuid NOT NULL,
	"invoice_number" varchar(40) NOT NULL,
	"latest_version" integer DEFAULT 1 NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "entity_media" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"upload_id" integer NOT NULL,
	"media_type" "media_type" NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"alt_text" varchar(255),
	"caption" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
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
CREATE TABLE "product_faqs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"product_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"option_name" varchar(100) NOT NULL,
	"option_value" varchar(100) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(50),
	"cost_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"selling_price" numeric(10, 2) NOT NULL,
	"compare_at_price" numeric(10, 2),
	"inventory_quantity" integer DEFAULT 0 NOT NULL,
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
	CONSTRAINT "product_variants_cost_price_check" CHECK (cost_price >= 0),
	CONSTRAINT "product_variants_selling_price_check" CHECK (selling_price >= 0),
	CONSTRAINT "product_variants_compare_at_price_check" CHECK (compare_at_price IS NULL OR compare_at_price >= selling_price)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"product_title" varchar(255) NOT NULL,
	"secondary_title" varchar(255),
	"short_description" text,
	"full_description" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"cost_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"selling_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"compare_at_price" numeric(10, 2),
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
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"device_type" varchar(50),
	"browser" varchar(100),
	"operating_system" varchar(100),
	"ip_address" "inet",
	"location" varchar(200),
	"last_active" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(100) NOT NULL,
	"resource" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
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
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
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
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"code" varchar(3) NOT NULL,
	"name" varchar(100) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"is_base_currency" boolean DEFAULT false NOT NULL,
	"use_real_time_rates" boolean DEFAULT true NOT NULL,
	"exchange_rate" numeric(18, 8) DEFAULT '1.00000000' NOT NULL,
	"manual_exchange_rate" numeric(18, 8),
	"rate_last_updated_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"code" varchar(2) NOT NULL,
	"code_alpha3" varchar(3) NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone_code" varchar(10),
	"currency_code" varchar(3),
	"is_shipping_enabled" boolean DEFAULT false NOT NULL,
	"is_billing_enabled" boolean DEFAULT false NOT NULL,
	"requires_state" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code"),
	CONSTRAINT "countries_code_alpha3_unique" UNIQUE("code_alpha3")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"has_special_tax" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"region_code" varchar(10),
	"postal_code_pattern" varchar(20),
	"tax_name" varchar(100) NOT NULL,
	"tax_code" varchar(20),
	"tax_rate" numeric(6, 3) NOT NULL,
	"tax_type" "tax_type" DEFAULT 'exclusive' NOT NULL,
	"applies_to" "tax_applies_to" DEFAULT 'all' NOT NULL,
	"is_compound" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_type" "ticket_message_sender_type" DEFAULT 'customer' NOT NULL,
	"sender_id" uuid,
	"message" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"ticket_number" varchar(50) NOT NULL,
	"customer_id" uuid,
	"order_id" uuid,
	"assigned_to" uuid,
	"subject" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"channel" "ticket_channel" DEFAULT 'system' NOT NULL,
	"created_via" "ticket_source" DEFAULT 'store' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"satisfaction_rating" integer,
	"satisfaction_comment" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "tickets_ticket_number_unique" UNIQUE("ticket_number")
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tiers_code_unique" UNIQUE("code")
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
CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"address_type" "address_type" DEFAULT 'shipping' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
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
	"credit_used" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"credit_approved_by" uuid,
	"credit_approved_at" timestamp,
	"account_manager_id" uuid,
	"tier" "business_tier" DEFAULT 'standard' NOT NULL,
	"bulk_discount_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"minimum_order_value" numeric(12, 2),
	"account_status" "business_account_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"suspended_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_customer_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"segment" "customer_segment" DEFAULT 'new' NOT NULL,
	"store_credit_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"referral_code" varchar(20),
	"referred_by_user_id" uuid,
	"referral_bonus_credited" boolean DEFAULT false NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"email_opt_in" boolean DEFAULT true NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"push_notifications_opt_in" boolean DEFAULT true NOT NULL,
	"account_status" "customer_account_status" DEFAULT 'active' NOT NULL,
	"suspended_reason" text,
	"suspended_until" timestamp,
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"auth_id" uuid,
	"customer_id" varchar(15),
	"user_type" "user_type" DEFAULT 'individual' NOT NULL,
	"name" varchar(255) NOT NULL,
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
	CONSTRAINT "users_customer_id_unique" UNIQUE("customer_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
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
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" varchar(255),
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_subsections" ADD CONSTRAINT "blog_subsections_blog_id_blogs_id_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_product_overrides" ADD CONSTRAINT "catalogue_product_overrides_catalogue_id_catalogues_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."catalogues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_product_overrides" ADD CONSTRAINT "catalogue_product_overrides_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_rules" ADD CONSTRAINT "catalogue_rules_catalogue_id_catalogues_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."catalogues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_documents" ADD CONSTRAINT "chatbot_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_session_id_chatbot_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chatbot_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_rules" ADD CONSTRAINT "collection_rules_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_rules" ADD CONSTRAINT "company_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_buy_x_collections" ADD CONSTRAINT "discount_buy_x_collections_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_buy_x_collections" ADD CONSTRAINT "discount_buy_x_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_buy_x_products" ADD CONSTRAINT "discount_buy_x_products_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_buy_x_products" ADD CONSTRAINT "discount_buy_x_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_customers" ADD CONSTRAINT "discount_customers_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_customers" ADD CONSTRAINT "discount_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_exclusions" ADD CONSTRAINT "discount_exclusions_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_get_y_collections" ADD CONSTRAINT "discount_get_y_collections_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_get_y_collections" ADD CONSTRAINT "discount_get_y_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_get_y_products" ADD CONSTRAINT "discount_get_y_products_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_get_y_products" ADD CONSTRAINT "discount_get_y_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_regions" ADD CONSTRAINT "discount_regions_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_segments" ADD CONSTRAINT "discount_segments_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_shipping_methods" ADD CONSTRAINT "discount_shipping_methods_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_shipping_zones" ADD CONSTRAINT "discount_shipping_zones_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_collections" ADD CONSTRAINT "discount_collections_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_collections" ADD CONSTRAINT "discount_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_products" ADD CONSTRAINT "discount_products_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_products" ADD CONSTRAINT "discount_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_daily_usage" ADD CONSTRAINT "discount_daily_usage_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usage" ADD CONSTRAINT "discount_usage_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usage" ADD CONSTRAINT "discount_usage_discount_code_discount_codes_code_fk" FOREIGN KEY ("discount_code") REFERENCES "public"."discount_codes"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usage" ADD CONSTRAINT "discount_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usage" ADD CONSTRAINT "discount_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_templates" ADD CONSTRAINT "gift_card_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_templates" ADD CONSTRAINT "gift_card_templates_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_performed_by_admin_id_users_id_fk" FOREIGN KEY ("performed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchaser_user_id_users_id_fk" FOREIGN KEY ("purchaser_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_issued_by_admin_id_users_id_fk" FOREIGN KEY ("issued_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_adjusted_by_users_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_from_location_id_inventory_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_to_location_id_inventory_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_related_order_id_orders_id_fk" FOREIGN KEY ("related_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_allocation_rules" ADD CONSTRAINT "location_allocation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_allocation_rules" ADD CONSTRAINT "location_allocation_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_inventory_adjustments" ADD CONSTRAINT "variant_inventory_adjustments_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_inventory_adjustments" ADD CONSTRAINT "variant_inventory_adjustments_adjusted_by_users_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_version_id_invoice_versions_id_fk" FOREIGN KEY ("invoice_version_id") REFERENCES "public"."invoice_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_versions" ADD CONSTRAINT "invoice_versions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_media" ADD CONSTRAINT "entity_media_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_logs" ADD CONSTRAINT "notification_delivery_logs_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_user_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_address_id_user_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_code_id_discount_codes_code_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tax_rule_id_tax_rules_id_fk" FOREIGN KEY ("tax_rule_id") REFERENCES "public"."tax_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_faqs" ADD CONSTRAINT "product_faqs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_1_tiers_id_fk" FOREIGN KEY ("category_tier_1") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_2_tiers_id_fk" FOREIGN KEY ("category_tier_2") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_3_tiers_id_fk" FOREIGN KEY ("category_tier_3") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_4_tiers_id_fk" FOREIGN KEY ("category_tier_4") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_billing_address_id_user_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_shipping_address_id_user_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_credit_approved_by_users_id_fk" FOREIGN KEY ("credit_approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_account_manager_id_users_id_fk" FOREIGN KEY ("account_manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" ADD CONSTRAINT "business_customer_profiles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_statistics" ADD CONSTRAINT "customer_statistics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_billing_address_id_user_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_invite_token_idx" ON "invitation" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "invitation_email_is_deleted_idx" ON "invitation" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "invitation_status_is_deleted_idx" ON "invitation" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE INDEX "invitation_expires_at_idx" ON "invitation" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "invitation_invited_by_idx" ON "invitation" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "blog_subsections_blog_id_idx" ON "blog_subsections" USING btree ("blog_id");--> statement-breakpoint
CREATE INDEX "blogs_slug_idx" ON "blogs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blogs_status_idx" ON "blogs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blogs_category_idx" ON "blogs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "bundle_items_bundle_id_idx" ON "bundle_items" USING btree ("bundle_id");--> statement-breakpoint
CREATE INDEX "bundle_items_product_id_idx" ON "bundle_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "bundles_status_idx" ON "bundles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bundles_validity_idx" ON "bundles" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "cart_items_product_id_idx" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "cart_items_bundle_id_idx" ON "cart_items" USING btree ("bundle_id");--> statement-breakpoint
CREATE INDEX "carts_user_id_idx" ON "carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "carts_session_id_idx" ON "carts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "carts_status_activity_idx" ON "carts" USING btree ("cart_status","last_activity_at");--> statement-breakpoint
CREATE INDEX "catalogue_overrides_product_id_idx" ON "catalogue_product_overrides" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "catalogue_rules_catalogue_id_idx" ON "catalogue_rules" USING btree ("catalogue_id");--> statement-breakpoint
CREATE INDEX "catalogues_status_idx" ON "catalogues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "catalogues_priority_idx" ON "catalogues" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "catalogues_dates_idx" ON "catalogues" USING btree ("valid_from","valid_to");--> statement-breakpoint
CREATE INDEX "chatbot_documents_status_is_deleted_idx" ON "chatbot_documents" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE INDEX "chatbot_documents_created_at_idx" ON "chatbot_documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chatbot_messages_session_id_is_deleted_idx" ON "chatbot_messages" USING btree ("session_id","is_deleted");--> statement-breakpoint
CREATE INDEX "chatbot_messages_created_at_idx" ON "chatbot_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chatbot_sessions_user_id_is_deleted_idx" ON "chatbot_sessions" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "chatbot_sessions_created_at_idx" ON "chatbot_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "collection_products_product_id_idx" ON "collection_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "collection_rules_collection_id_idx" ON "collection_rules" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collections_slug_idx" ON "collections" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "collections_type_idx" ON "collections" USING btree ("type");--> statement-breakpoint
CREATE INDEX "collections_status_idx" ON "collections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "company_rules_company_id_idx" ON "company_rules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "companies_name_idx" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discount_buy_x_collections_collection_id_idx" ON "discount_buy_x_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "discount_buy_x_products_product_id_idx" ON "discount_buy_x_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "discount_customers_user_id_idx" ON "discount_customers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "discount_exclusions_discount_id_idx" ON "discount_exclusions" USING btree ("discount_id");--> statement-breakpoint
CREATE INDEX "discount_exclusions_type_idx" ON "discount_exclusions" USING btree ("exclusion_type");--> statement-breakpoint
CREATE INDEX "discount_get_y_collections_collection_id_idx" ON "discount_get_y_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "discount_get_y_products_product_id_idx" ON "discount_get_y_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "discount_regions_country_code_idx" ON "discount_regions" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "discount_segments_segment_id_idx" ON "discount_segments" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "discount_shipping_methods_method_id_idx" ON "discount_shipping_methods" USING btree ("shipping_method_id");--> statement-breakpoint
CREATE INDEX "discount_shipping_zones_zone_id_idx" ON "discount_shipping_zones" USING btree ("shipping_zone_id");--> statement-breakpoint
CREATE INDEX "discount_codes_discount_id_idx" ON "discount_codes" USING btree ("discount_id");--> statement-breakpoint
CREATE INDEX "discount_collections_collection_id_idx" ON "discount_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "discount_products_product_id_idx" ON "discount_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "discount_daily_usage_discount_date_idx" ON "discount_daily_usage" USING btree ("discount_id","usage_date");--> statement-breakpoint
CREATE INDEX "discount_usage_discount_id_idx" ON "discount_usage" USING btree ("discount_id");--> statement-breakpoint
CREATE INDEX "discount_usage_discount_code_idx" ON "discount_usage" USING btree ("discount_code");--> statement-breakpoint
CREATE INDEX "discount_usage_user_id_idx" ON "discount_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "discount_usage_order_id_idx" ON "discount_usage" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "discount_usage_used_at_idx" ON "discount_usage" USING btree ("used_at");--> statement-breakpoint
CREATE INDEX "discount_usage_user_discount_idx" ON "discount_usage" USING btree ("user_id","discount_id");--> statement-breakpoint
CREATE INDEX "discount_usage_user_code_idx" ON "discount_usage" USING btree ("user_id","discount_code");--> statement-breakpoint
CREATE INDEX "discounts_status_idx" ON "discounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discounts_type_idx" ON "discounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "discounts_dates_idx" ON "discounts" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "discounts_is_deleted_idx" ON "discounts" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "discounts_active_idx" ON "discounts" USING btree ("status","is_deleted","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "faqs_target_type_idx" ON "faqs" USING btree ("target_type");--> statement-breakpoint
CREATE INDEX "faqs_product_id_idx" ON "faqs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "faqs_tier_id_idx" ON "faqs" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX "faqs_section_idx" ON "faqs" USING btree ("section");--> statement-breakpoint
CREATE INDEX "gift_card_templates_name_idx" ON "gift_card_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "gift_card_templates_is_active_idx" ON "gift_card_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_card_created_idx" ON "gift_card_transactions" USING btree ("gift_card_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_order_id_idx" ON "gift_card_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_idempotency_idx" ON "gift_card_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "gift_cards_code_idx" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "gift_cards_recipient_email_idx" ON "gift_cards" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "gift_cards_status_expiry_idx" ON "gift_cards" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "gift_cards_batch_id_idx" ON "gift_cards" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "gift_cards_purchaser_idx" ON "gift_cards" USING btree ("purchaser_user_id");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_inventory_adjusted_idx" ON "inventory_adjustments" USING btree ("inventory_id","adjusted_at");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_adjusted_by_idx" ON "inventory_adjustments" USING btree ("adjusted_by");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_type_idx" ON "inventory_adjustments" USING btree ("adjustment_type");--> statement-breakpoint
CREATE INDEX "inventory_locations_code_idx" ON "inventory_locations" USING btree ("location_code");--> statement-breakpoint
CREATE INDEX "inventory_locations_type_active_idx" ON "inventory_locations" USING btree ("type","is_active");--> statement-breakpoint
CREATE INDEX "inventory_locations_default_idx" ON "inventory_locations" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "inventory_product_idx" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_sku_idx" ON "inventory" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "inventory_status_idx" ON "inventory" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_condition_idx" ON "inventory" USING btree ("condition");--> statement-breakpoint
CREATE INDEX "inventory_location_id_idx" ON "inventory" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "inventory_product_location_idx" ON "inventory" USING btree ("product_id","location_id");--> statement-breakpoint
CREATE INDEX "production_orders_order_number_idx" ON "production_orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "production_orders_product_status_idx" ON "production_orders" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "production_orders_status_priority_idx" ON "production_orders" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "production_orders_scheduled_completion_idx" ON "production_orders" USING btree ("scheduled_completion_date");--> statement-breakpoint
CREATE INDEX "variant_inventory_adjustments_variant_adjusted_idx" ON "variant_inventory_adjustments" USING btree ("variant_id","adjusted_at");--> statement-breakpoint
CREATE INDEX "variant_inventory_adjustments_adjusted_by_idx" ON "variant_inventory_adjustments" USING btree ("adjusted_by");--> statement-breakpoint
CREATE INDEX "variant_inventory_adjustments_type_idx" ON "variant_inventory_adjustments" USING btree ("adjustment_type");--> statement-breakpoint
CREATE INDEX "invoice_line_items_version_id_idx" ON "invoice_line_items" USING btree ("invoice_version_id");--> statement-breakpoint
CREATE INDEX "invoice_versions_invoice_id_idx" ON "invoice_versions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_versions_version_idx" ON "invoice_versions" USING btree ("invoice_id","version_number");--> statement-breakpoint
CREATE INDEX "invoices_invoice_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_order_id_idx" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "entity_media_entity_idx" ON "entity_media" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "entity_media_display_order_idx" ON "entity_media" USING btree ("entity_type","entity_id","display_order");--> statement-breakpoint
CREATE INDEX "entity_media_upload_id_idx" ON "entity_media" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "entity_media_primary_idx" ON "entity_media" USING btree ("entity_type","entity_id","is_primary");--> statement-breakpoint
CREATE INDEX "entity_media_type_idx" ON "entity_media" USING btree ("entity_type","entity_id","media_type");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_is_draft_idx" ON "orders" USING btree ("is_draft");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "orders_fulfillment_status_idx" ON "orders" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_draft_payment_idx" ON "orders" USING btree ("is_draft","payment_status");--> statement-breakpoint
CREATE INDEX "orders_razorpay_order_id_idx" ON "orders" USING btree ("razorpay_order_id");--> statement-breakpoint
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
CREATE INDEX "product_faqs_product_id_idx" ON "product_faqs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_is_deleted_idx" ON "product_variants" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_tier_1","category_tier_2");--> statement-breakpoint
CREATE INDEX "products_search_vector_idx" ON "products" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "products_tags_idx" ON "products" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" USING btree ("selling_price");--> statement-breakpoint
CREATE INDEX "products_category_price_status_idx" ON "products" USING btree ("category_tier_1","selling_price","status","is_deleted");--> statement-breakpoint
CREATE INDEX "products_is_deleted_idx" ON "products" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_last_active_idx" ON "sessions" USING btree ("last_active");--> statement-breakpoint
CREATE INDEX "permissions_resource_idx" ON "permissions" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "permissions_resource_action_idx" ON "permissions" USING btree ("resource","action");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "roles_is_active_idx" ON "roles" USING btree ("is_active","is_deleted");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_roles_expires_at_idx" ON "user_roles" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "product_questions_product_id_idx" ON "product_questions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_questions_status_idx" ON "product_questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_product_id_idx" ON "reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "reviews_user_id_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_rating_idx" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "currencies_active_idx" ON "currencies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "currencies_base_idx" ON "currencies" USING btree ("is_base_currency");--> statement-breakpoint
CREATE INDEX "currencies_code_idx" ON "currencies" USING btree ("code");--> statement-breakpoint
CREATE INDEX "countries_active_idx" ON "countries" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "countries_code_idx" ON "countries" USING btree ("code");--> statement-breakpoint
CREATE INDEX "regions_country_idx" ON "regions" USING btree ("country_code","is_active");--> statement-breakpoint
CREATE INDEX "regions_country_code_unique_idx" ON "regions" USING btree ("country_code","code");--> statement-breakpoint
CREATE INDEX "tax_rules_country_active_idx" ON "tax_rules" USING btree ("country_code","is_active","effective_from");--> statement-breakpoint
CREATE INDEX "tax_rules_region_idx" ON "tax_rules" USING btree ("country_code","region_code");--> statement-breakpoint
CREATE INDEX "tax_rules_tax_code_idx" ON "tax_rules" USING btree ("tax_code");--> statement-breakpoint
CREATE INDEX "tax_rules_effective_idx" ON "tax_rules" USING btree ("effective_from","effective_until");--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tags_type_idx" ON "tags" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket_created_idx" ON "ticket_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "ticket_messages_sender_type_idx" ON "ticket_messages" USING btree ("sender_type");--> statement-breakpoint
CREATE INDEX "tickets_ticket_number_idx" ON "tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "tickets_customer_status_idx" ON "tickets" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "tickets_assigned_status_idx" ON "tickets" USING btree ("assigned_to","status");--> statement-breakpoint
CREATE INDEX "tickets_status_priority_idx" ON "tickets" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tickets_category_idx" ON "tickets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tiers_parent_id_idx" ON "tiers" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "tiers_level_idx" ON "tiers" USING btree ("level");--> statement-breakpoint
CREATE INDEX "tiers_code_idx" ON "tiers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "tiers_status_idx" ON "tiers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "uploads_user_id_is_deleted_idx" ON "uploads" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "uploads_status_idx" ON "uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "uploads_mime_type_idx" ON "uploads" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "uploads_created_at_idx" ON "uploads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "user_addresses_user_default_idx" ON "user_addresses" USING btree ("user_id","address_type","is_default","is_deleted");--> statement-breakpoint
CREATE INDEX "user_addresses_country_idx" ON "user_addresses" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "user_addresses_unique_default_idx" ON "user_addresses" USING btree ("user_id","address_type") WHERE "user_addresses"."is_default" = true AND "user_addresses"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "admin_profiles_department_idx" ON "admin_profiles" USING btree ("department","is_active");--> statement-breakpoint
CREATE INDEX "admin_profiles_is_active_idx" ON "admin_profiles" USING btree ("is_active","is_deleted");--> statement-breakpoint
CREATE INDEX "admin_profiles_employee_id_idx" ON "admin_profiles" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "business_profiles_status_idx" ON "business_customer_profiles" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "business_profiles_tier_idx" ON "business_customer_profiles" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "business_profiles_account_manager_idx" ON "business_customer_profiles" USING btree ("account_manager_id");--> statement-breakpoint
CREATE INDEX "customer_profiles_referral_code_idx" ON "customer_profiles" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "customer_profiles_status_idx" ON "customer_profiles" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "customer_profiles_segment_idx" ON "customer_profiles" USING btree ("segment");--> statement-breakpoint
CREATE INDEX "customer_profiles_risk_idx" ON "customer_profiles" USING btree ("risk_profile");--> statement-breakpoint
CREATE INDEX "customer_stats_updated_at_idx" ON "customer_statistics" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "customer_stats_total_spent_idx" ON "customer_statistics" USING btree ("total_spent");--> statement-breakpoint
CREATE INDEX "customer_stats_total_orders_idx" ON "customer_statistics" USING btree ("total_orders");--> statement-breakpoint
CREATE INDEX "email_otps_email_idx" ON "email_otps" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_otps_expires_at_idx" ON "email_otps" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_payment_methods_user_id_idx" ON "user_payment_methods" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "user_payment_methods_user_default_idx" ON "user_payment_methods" USING btree ("user_id","is_default","is_deleted");--> statement-breakpoint
CREATE INDEX "user_payment_methods_razorpay_customer_idx" ON "user_payment_methods" USING btree ("razorpay_customer_id");--> statement-breakpoint
CREATE INDEX "users_email_is_deleted_idx" ON "users" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_auth_id_idx" ON "users" USING btree ("auth_id");--> statement-breakpoint
CREATE INDEX "users_user_type_idx" ON "users" USING btree ("user_type","is_deleted");--> statement-breakpoint
CREATE INDEX "users_email_verified_idx" ON "users" USING btree ("email_verified","is_deleted");--> statement-breakpoint
CREATE INDEX "wishlist_items_product_id_idx" ON "wishlist_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "wishlists_user_id_idx" ON "wishlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wishlists_access_token_idx" ON "wishlists" USING btree ("access_token");