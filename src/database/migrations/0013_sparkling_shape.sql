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
ALTER TABLE "inventory_locations" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "has_variants" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "secondary_email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "variant_inventory_adjustments" ADD CONSTRAINT "variant_inventory_adjustments_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_inventory_adjustments" ADD CONSTRAINT "variant_inventory_adjustments_adjusted_by_users_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "variant_inventory_adjustments_variant_adjusted_idx" ON "variant_inventory_adjustments" USING btree ("variant_id","adjusted_at");--> statement-breakpoint
CREATE INDEX "variant_inventory_adjustments_adjusted_by_idx" ON "variant_inventory_adjustments" USING btree ("adjusted_by");--> statement-breakpoint
CREATE INDEX "variant_inventory_adjustments_type_idx" ON "variant_inventory_adjustments" USING btree ("adjustment_type");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_is_deleted_idx" ON "product_variants" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "inventory_locations_default_idx" ON "inventory_locations" USING btree ("is_default");