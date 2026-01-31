ALTER TYPE "public"."order_status" ADD VALUE 'returned';--> statement-breakpoint
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_bundle_id_bundles_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."payment_status";--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'refunded', 'failed', 'partially_refunded');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'pending'::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE "public"."payment_status" USING "payment_status"::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_reserved_from_location_id_inventory_locations_id_fk" FOREIGN KEY ("reserved_from_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inventory_product_location" ON "inventory" USING btree ("product_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_cart_items_cart_id" ON "cart_items" USING btree ("cart_id") WHERE is_deleted = false;--> statement-breakpoint
CREATE INDEX "idx_orders_user_status" ON "orders" USING btree ("user_id","order_status") WHERE is_deleted = false;--> statement-breakpoint
CREATE INDEX "idx_orders_status_dates" ON "orders" USING btree ("order_status","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_timestamp" ON "audit_logs" USING btree ("user_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "uq_variant_option" UNIQUE("product_id","option_name","option_value");--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "uq_inventory_product_location" UNIQUE("product_id","location_id");