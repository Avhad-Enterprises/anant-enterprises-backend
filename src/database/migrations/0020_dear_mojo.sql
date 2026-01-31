DROP INDEX "inventory_sku_idx";--> statement-breakpoint
ALTER TABLE "inventory" DROP COLUMN "product_name";--> statement-breakpoint
ALTER TABLE "inventory" DROP COLUMN "sku";