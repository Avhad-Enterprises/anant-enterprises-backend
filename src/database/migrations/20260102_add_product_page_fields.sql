-- Migration: Add Product Page Enhancement Fields
-- Created: 2026-01-02
-- Description: Adds brand, tags, highlights, features, and specs fields to products table

-- Add brand fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_slug VARCHAR(255);

-- Add feature tags
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add bullet point highlights
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb;

-- Add feature cards with icons
ALTER TABLE products ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- Add technical specifications
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_brand_slug ON products(brand_slug);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);

-- Comments
COMMENT ON COLUMN products.brand_name IS 'Brand display name';
COMMENT ON COLUMN products.brand_slug IS 'URL-friendly brand identifier';
COMMENT ON COLUMN products.tags IS 'Feature tags array (e.g., ["RO", "UV", "UF"])';
COMMENT ON COLUMN products.highlights IS 'Bullet point highlights array';
COMMENT ON COLUMN products.features IS 'Feature cards with icon, title, description';
COMMENT ON COLUMN products.specs IS 'Technical specifications for comparison';
