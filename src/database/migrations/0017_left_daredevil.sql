ALTER TABLE "inventory" DROP CONSTRAINT "uq_inventory_product_location";--> statement-breakpoint
DROP INDEX "idx_inventory_product_location";--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_variant_idx" ON "inventory" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "inventory_variant_location_idx" ON "inventory" USING btree ("variant_id","location_id");--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "uq_inventory_product_variant_location" UNIQUE("product_id","variant_id","location_id");--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_or_variant_check" CHECK ((product_id IS NOT NULL AND variant_id IS NULL) OR (product_id IS NULL AND variant_id IS NOT NULL));