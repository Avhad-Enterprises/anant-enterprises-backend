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
CREATE TYPE "public"."discount_status" AS ENUM('active', 'inactive', 'draft', 'scheduled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y');--> statement-breakpoint
CREATE TYPE "public"."discount_min_requirement_type" AS ENUM('none', 'min_amount', 'min_quantity');--> statement-breakpoint
CREATE TYPE "public"."faq_target_type" AS ENUM('general', 'product', 'tier');--> statement-breakpoint
CREATE TYPE "public"."gift_card_character_set" AS ENUM('alphanumeric', 'alphabets', 'numbers');--> statement-breakpoint
CREATE TYPE "public"."gift_card_transaction_type" AS ENUM('issue', 'redeem', 'refund', 'adjustment', 'expiry_reversal', 'cancellation');--> statement-breakpoint
CREATE TYPE "public"."gift_card_delivery_method" AS ENUM('email', 'physical', 'instant');--> statement-breakpoint
CREATE TYPE "public"."gift_card_source" AS ENUM('purchase', 'promotion', 'refund', 'compensation', 'bulk_import');--> statement-breakpoint
CREATE TYPE "public"."gift_card_status" AS ENUM('active', 'partially_used', 'fully_redeemed', 'expired', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."adjustment_type" AS ENUM('increase', 'decrease', 'correction', 'write-off');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('warehouse', 'factory', 'store', 'transit');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('Enough Stock', 'Shortage', 'In Production', 'Low Stock');--> statement-breakpoint
CREATE TYPE "public"."production_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."production_status" AS ENUM('pending', 'in_progress', 'completed', 'delayed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('unfulfilled', 'partial', 'fulfilled', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_channel" AS ENUM('web', 'app', 'pos', 'marketplace', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_discount_type" AS ENUM('percent', 'amount', 'none');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'partially_paid', 'paid', 'refunded', 'failed', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived', 'schedule');--> statement-breakpoint
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
CREATE TYPE "public"."address_type" AS ENUM('billing', 'shipping', 'both', 'company');--> statement-breakpoint
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
	"assigned_role_id" integer,
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
	"resource_id" integer,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blog_id" uuid NOT NULL,
	"title" varchar(255),
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"quote" varchar(500),
	"description" varchar(150),
	"content" text,
	"slug" varchar(255) NOT NULL,
	"main_image_pc_url" text,
	"main_image_mobile_url" text,
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
	CONSTRAINT "blogs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bundle_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"type" "bundle_type" DEFAULT 'fixed_price' NOT NULL,
	"status" "bundle_status" DEFAULT 'draft' NOT NULL,
	"price_value" numeric(10, 2),
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"bundle_snapshot" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalogue_id" uuid NOT NULL,
	"field" varchar(50) NOT NULL,
	"operator" varchar(50) NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"field" varchar(50) NOT NULL,
	"operator" varchar(50) NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"field" varchar(50) NOT NULL,
	"operator" varchar(50) NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" "discount_type" NOT NULL,
	"value" numeric(10, 2),
	"min_requirement_type" "discount_min_requirement_type" DEFAULT 'none' NOT NULL,
	"min_requirement_value" numeric(10, 2),
	"usage_limit" integer,
	"once_per_customer" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"status" "discount_status" DEFAULT 'draft' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "inventory_locations_location_code_unique" UNIQUE("location_code"),
	CONSTRAINT "inventory_locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"required_quantity" integer DEFAULT 0 NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"reservation_expires_at" timestamp,
	"shortage_quantity" integer GENERATED ALWAYS AS (GREATEST(required_quantity - available_quantity, 0)) STORED,
	"status" "inventory_status" DEFAULT 'Enough Stock' NOT NULL,
	"location" varchar(255),
	"last_counted_at" timestamp,
	"next_count_due" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(40) NOT NULL,
	"user_id" uuid,
	"cart_id" uuid,
	"shipping_address_id" integer,
	"billing_address_id" integer,
	"channel" "order_channel" DEFAULT 'web' NOT NULL,
	"order_status" "order_status" DEFAULT 'pending' NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"payment_method" varchar(60),
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_ref" varchar(120),
	"transaction_id" varchar(120),
	"paid_at" timestamp,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
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
CREATE TABLE "product_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"variant_name" varchar(100) NOT NULL,
	"variant_value" varchar(100) NOT NULL,
	"sku" varchar(100),
	"price_adjustment" numeric(10, 2) DEFAULT '0.00',
	"inventory_quantity" integer DEFAULT 0,
	"is_default" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"product_title" varchar(255) NOT NULL,
	"secondary_title" varchar(255),
	"short_description" text,
	"full_description" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"scheduled_publish_at" timestamp,
	"is_delisted" boolean DEFAULT false NOT NULL,
	"delist_date" timestamp,
	"sales_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cost_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"selling_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"compare_at_price" numeric(10, 2),
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(50),
	"hsn_code" varchar(20),
	"weight" numeric(8, 2),
	"length" numeric(8, 2),
	"breadth" numeric(8, 2),
	"height" numeric(8, 2),
	"pickup_location" varchar(100),
	"category_tier_1" varchar(100),
	"category_tier_2" varchar(100),
	"category_tier_3" varchar(100),
	"category_tier_4" varchar(100),
	"size_group" varchar(100),
	"accessories_group" varchar(100),
	"primary_image_url" text,
	"additional_images" jsonb DEFAULT '[]'::jsonb,
	"meta_title" varchar(255),
	"meta_description" text,
	"is_limited_edition" boolean DEFAULT false NOT NULL,
	"is_preorder_enabled" boolean DEFAULT false NOT NULL,
	"preorder_release_date" timestamp,
	"is_gift_wrap_available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" integer,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"resource" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_system_role" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "product_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"id" serial PRIMARY KEY NOT NULL,
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
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"has_special_tax" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" serial PRIMARY KEY NOT NULL,
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
CREATE TABLE "product_tags" (
	"product_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "product_tags_product_id_tag_id_pk" PRIMARY KEY("product_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "product_tiers" (
	"product_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_tiers_product_id_tier_id_pk" PRIMARY KEY("product_id","tier_id")
);
--> statement-breakpoint
CREATE TABLE "tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"description" text,
	"level" integer NOT NULL,
	"parent_id" uuid,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" "tier_status" DEFAULT 'active' NOT NULL,
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
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"id" serial PRIMARY KEY NOT NULL,
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
	"id" serial PRIMARY KEY NOT NULL,
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
	"billing_address_id" integer,
	"shipping_address_id" integer,
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
	"id" serial PRIMARY KEY NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "customer_profiles_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "customer_statistics" (
	"id" serial PRIMARY KEY NOT NULL,
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
CREATE TABLE "user_payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"billing_address_id" integer,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" uuid,
	"user_type" "user_type" DEFAULT 'individual' NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"phone_number" varchar(20),
	"phone_country_code" varchar(5),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"phone_verified_at" timestamp,
	"profile_image_url" varchar(500),
	"date_of_birth" date,
	"gender" "gender",
	"preferred_language" varchar(10) DEFAULT 'en' NOT NULL,
	"preferred_currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_collections" ADD CONSTRAINT "discount_collections_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_collections" ADD CONSTRAINT "discount_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_products" ADD CONSTRAINT "discount_products_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_products" ADD CONSTRAINT "discount_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_user_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_address_id_user_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_code_id_discount_codes_code_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_faqs" ADD CONSTRAINT "product_faqs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "product_tiers" ADD CONSTRAINT "product_tiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tiers" ADD CONSTRAINT "product_tiers_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "discount_codes_discount_id_idx" ON "discount_codes" USING btree ("discount_id");--> statement-breakpoint
CREATE INDEX "discount_collections_collection_id_idx" ON "discount_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "discount_products_product_id_idx" ON "discount_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "discounts_status_idx" ON "discounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discounts_type_idx" ON "discounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "discounts_dates_idx" ON "discounts" USING btree ("starts_at","ends_at");--> statement-breakpoint
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
CREATE INDEX "inventory_product_location_idx" ON "inventory" USING btree ("product_id","location_id");--> statement-breakpoint
CREATE INDEX "inventory_status_idx" ON "inventory" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_shortage_idx" ON "inventory" USING btree ("shortage_quantity");--> statement-breakpoint
CREATE INDEX "inventory_sku_idx" ON "inventory" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "production_orders_order_number_idx" ON "production_orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "production_orders_product_status_idx" ON "production_orders" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "production_orders_status_priority_idx" ON "production_orders" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "production_orders_scheduled_completion_idx" ON "production_orders" USING btree ("scheduled_completion_date");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_is_draft_idx" ON "orders" USING btree ("is_draft");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "orders_fulfillment_status_idx" ON "orders" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_draft_payment_idx" ON "orders" USING btree ("is_draft","payment_status");--> statement-breakpoint
CREATE INDEX "product_faqs_product_id_idx" ON "product_faqs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_tier_1","category_tier_2");--> statement-breakpoint
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
CREATE INDEX "product_tags_tag_id_idx" ON "product_tags" USING btree ("tag_id");--> statement-breakpoint
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
CREATE INDEX "product_tiers_tier_id_idx" ON "product_tiers" USING btree ("tier_id");--> statement-breakpoint
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
CREATE INDEX "customer_stats_updated_at_idx" ON "customer_statistics" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "customer_stats_total_spent_idx" ON "customer_statistics" USING btree ("total_spent");--> statement-breakpoint
CREATE INDEX "customer_stats_total_orders_idx" ON "customer_statistics" USING btree ("total_orders");--> statement-breakpoint
CREATE INDEX "user_payment_methods_user_id_idx" ON "user_payment_methods" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "user_payment_methods_user_default_idx" ON "user_payment_methods" USING btree ("user_id","is_default","is_deleted");--> statement-breakpoint
CREATE INDEX "user_payment_methods_razorpay_customer_idx" ON "user_payment_methods" USING btree ("razorpay_customer_id");--> statement-breakpoint
CREATE INDEX "users_email_is_deleted_idx" ON "users" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_auth_id_idx" ON "users" USING btree ("auth_id");--> statement-breakpoint
CREATE INDEX "users_user_type_idx" ON "users" USING btree ("user_type","is_deleted");--> statement-breakpoint
CREATE INDEX "wishlist_items_product_id_idx" ON "wishlist_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "wishlists_user_id_idx" ON "wishlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wishlists_access_token_idx" ON "wishlists" USING btree ("access_token");