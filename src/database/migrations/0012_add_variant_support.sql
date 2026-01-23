-- Migration: Add product variant support
-- Description: Adds has_variants column to products table and updates product_variants table with new columns

-- Add has_variants column to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "has_variants" boolean DEFAULT false NOT NULL;

-- Add new columns to product_variants table
-- These columns may already exist, so we use IF NOT EXISTS

-- Add cost_price column
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "cost_price" numeric(10, 2) DEFAULT '0.00' NOT NULL;

-- Add selling_price column (update existing if needed)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'product_variants' AND column_name = 'selling_price') THEN
        ALTER TABLE "product_variants" ADD COLUMN "selling_price" numeric(10, 2) NOT NULL DEFAULT '0.00';
    END IF;
END $$;

-- Add compare_at_price column
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "compare_at_price" numeric(10, 2);

-- Add thumbnail_url column
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;

-- Add audit columns
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "created_by" uuid;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "updated_by" uuid;

-- Add soft delete columns
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false NOT NULL;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "deleted_by" uuid;

-- Add barcode column
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "barcode" varchar(50);

-- Update is_active to have NOT NULL constraint with default
ALTER TABLE "product_variants" ALTER COLUMN "is_active" SET DEFAULT true;
ALTER TABLE "product_variants" ALTER COLUMN "is_active" SET NOT NULL;

-- Update is_default to have NOT NULL constraint with default
ALTER TABLE "product_variants" ALTER COLUMN "is_default" SET DEFAULT false;
ALTER TABLE "product_variants" ALTER COLUMN "is_default" SET NOT NULL;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants" ("product_id");
CREATE INDEX IF NOT EXISTS "product_variants_sku_idx" ON "product_variants" ("sku");
CREATE INDEX IF NOT EXISTS "product_variants_is_deleted_idx" ON "product_variants" ("is_deleted");

-- Add check constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_cost_price_check'
    ) THEN
        ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_cost_price_check" 
        CHECK (cost_price >= 0);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_selling_price_check'
    ) THEN
        ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_selling_price_check" 
        CHECK (selling_price >= 0);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_compare_at_price_check'
    ) THEN
        ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_compare_at_price_check" 
        CHECK (compare_at_price IS NULL OR compare_at_price >= selling_price);
    END IF;
END $$;

-- Comment on table
COMMENT ON TABLE "product_variants" IS 'Stores variant options for products with independent pricing and inventory';
