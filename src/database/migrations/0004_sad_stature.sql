ALTER TABLE "product_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_tiers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "product_tags" CASCADE;--> statement-breakpoint
DROP TABLE "product_tiers" CASCADE;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
DROP TYPE "public"."product_status";--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."product_status";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "status" SET DATA TYPE "public"."product_status" USING "status"::"public"."product_status";--> statement-breakpoint
ALTER TABLE "products" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', 
                    COALESCE(product_title, '') || ' ' || 
                    COALESCE(short_description, '')
                )) STORED;--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN "admin_comment" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "barcode" varchar(50);--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "scheduled_publish_at";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "scheduled_publish_time";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "is_delisted";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "delist_date";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "pickup_location";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "brand_name";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "brand_slug";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "highlights";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "features";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "specs";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "size_group";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "accessories_group";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "admin_comment";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "is_limited_edition";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "is_preorder_enabled";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "preorder_release_date";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "is_gift_wrap_available";