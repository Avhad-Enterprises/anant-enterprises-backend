CREATE TYPE "public"."inventory_condition" AS ENUM('sellable', 'damaged', 'quarantined', 'expired');--> statement-breakpoint
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_location_id_inventory_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "status" SET DEFAULT 'in_stock'::text;--> statement-breakpoint
DROP TYPE "public"."inventory_status";--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('in_stock', 'low_stock', 'out_of_stock');--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "status" SET DEFAULT 'in_stock'::"public"."inventory_status";--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "status" SET DATA TYPE "public"."inventory_status" USING (
  CASE 
    WHEN "status" = 'Enough Stock' THEN 'in_stock'::"public"."inventory_status"
    WHEN "status" = 'Low Stock' THEN 'low_stock'::"public"."inventory_status"
    WHEN "status" = 'Out of Stock' THEN 'out_of_stock'::"public"."inventory_status"
    ELSE 'in_stock'::"public"."inventory_status"
  END
);--> statement-breakpoint
DROP INDEX "inventory_product_location_idx";--> statement-breakpoint
DROP INDEX "inventory_shortage_idx";--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "incoming_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "incoming_po_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "incoming_eta" timestamp;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "condition" "inventory_condition" DEFAULT 'sellable' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_product_idx" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_condition_idx" ON "inventory" USING btree ("condition");--> statement-breakpoint
ALTER TABLE "inventory" DROP COLUMN "location_id";--> statement-breakpoint
ALTER TABLE "inventory" DROP COLUMN "shortage_quantity";--> statement-breakpoint
ALTER TABLE "inventory" DROP COLUMN "required_quantity";--> statement-breakpoint
ALTER TABLE "inventory" DROP COLUMN "reservation_expires_at";--> statement-breakpoint
ALTER TABLE "inventory" DROP COLUMN "last_counted_at";--> statement-breakpoint
ALTER TABLE "inventory" DROP COLUMN "next_count_due";--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_incoming_qty_check" CHECK (incoming_quantity >= 0);