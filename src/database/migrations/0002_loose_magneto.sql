DROP TABLE "product_variants" CASCADE;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "scheduled_publish_time" varchar(10);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_url" varchar(500);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "admin_comment" text;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "sales_channels";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "barcode";