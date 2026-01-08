CREATE TYPE "public"."buy_x_trigger_type" AS ENUM('quantity', 'amount');--> statement-breakpoint
CREATE TYPE "public"."discount_applies_to" AS ENUM('entire_order', 'specific_products', 'specific_collections');--> statement-breakpoint
CREATE TYPE "public"."geo_restriction" AS ENUM('none', 'specific_regions');--> statement-breakpoint
CREATE TYPE "public"."get_y_applies_to" AS ENUM('same', 'specific_products', 'specific_collections', 'cheapest');--> statement-breakpoint
CREATE TYPE "public"."get_y_type" AS ENUM('free', 'percentage', 'amount', 'fixed_price');--> statement-breakpoint
CREATE TYPE "public"."shipping_scope" AS ENUM('all', 'specific_methods', 'specific_zones');--> statement-breakpoint
CREATE TYPE "public"."target_audience" AS ENUM('all', 'specific_customers', 'segments');--> statement-breakpoint
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "discount_daily_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discount_id" uuid NOT NULL,
	"usage_date" timestamp NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
ALTER TABLE "discounts" ADD COLUMN "description" varchar(500);--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "max_discount_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "applies_to" "discount_applies_to" DEFAULT 'entire_order' NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "buy_x_trigger_type" "buy_x_trigger_type";--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "buy_x_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "buy_x_applies_to" "discount_applies_to";--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "buy_x_same_product" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "buy_x_repeat" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "get_y_type" "get_y_type";--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "get_y_applies_to" "get_y_applies_to";--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "get_y_quantity" integer;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "get_y_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "get_y_max_rewards" integer;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "shipping_scope" "shipping_scope";--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "shipping_min_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "shipping_min_items" integer;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "shipping_cap" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "target_audience" "target_audience" DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "geo_restriction" "geo_restriction" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "usage_per_customer" integer;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "usage_per_day" integer;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "usage_per_order" integer;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "limit_new_customers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "limit_returning_customers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "total_usage_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "total_discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "total_orders_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "admin_comment" varchar(500);--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
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
ALTER TABLE "discount_daily_usage" ADD CONSTRAINT "discount_daily_usage_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usage" ADD CONSTRAINT "discount_usage_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usage" ADD CONSTRAINT "discount_usage_discount_code_discount_codes_code_fk" FOREIGN KEY ("discount_code") REFERENCES "public"."discount_codes"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usage" ADD CONSTRAINT "discount_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usage" ADD CONSTRAINT "discount_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "discount_daily_usage_discount_date_idx" ON "discount_daily_usage" USING btree ("discount_id","usage_date");--> statement-breakpoint
CREATE INDEX "discount_usage_discount_id_idx" ON "discount_usage" USING btree ("discount_id");--> statement-breakpoint
CREATE INDEX "discount_usage_discount_code_idx" ON "discount_usage" USING btree ("discount_code");--> statement-breakpoint
CREATE INDEX "discount_usage_user_id_idx" ON "discount_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "discount_usage_order_id_idx" ON "discount_usage" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "discount_usage_used_at_idx" ON "discount_usage" USING btree ("used_at");--> statement-breakpoint
CREATE INDEX "discount_usage_user_discount_idx" ON "discount_usage" USING btree ("user_id","discount_id");--> statement-breakpoint
CREATE INDEX "discount_usage_user_code_idx" ON "discount_usage" USING btree ("user_id","discount_code");--> statement-breakpoint
CREATE INDEX "discounts_is_deleted_idx" ON "discounts" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "discounts_active_idx" ON "discounts" USING btree ("status","is_deleted","starts_at","ends_at");--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_value_check" CHECK (
      (type IN ('free_shipping', 'buy_x_get_y')) OR 
      (type IN ('percentage', 'fixed_amount') AND value IS NOT NULL)
    );