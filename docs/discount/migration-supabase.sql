-- ============================================
-- DISCOUNT FEATURE MIGRATION - PHASE 1
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CREATE NEW ENUMS
DO $$ BEGIN CREATE TYPE buy_x_trigger_type AS ENUM('quantity', 'amount'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE discount_applies_to AS ENUM('entire_order', 'specific_products', 'specific_collections'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE geo_restriction AS ENUM('none', 'specific_regions'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE get_y_applies_to AS ENUM('same', 'specific_products', 'specific_collections', 'cheapest'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE get_y_type AS ENUM('free', 'percentage', 'amount', 'fixed_price'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE shipping_scope AS ENUM('all', 'specific_methods', 'specific_zones'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE target_audience AS ENUM('all', 'specific_customers', 'segments'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. ADD NEW COLUMNS TO DISCOUNTS TABLE
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS description varchar(500);
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS max_discount_amount numeric(10, 2);
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS applies_to discount_applies_to DEFAULT 'entire_order' NOT NULL;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS buy_x_trigger_type buy_x_trigger_type;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS buy_x_value numeric(10, 2);
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS buy_x_applies_to discount_applies_to;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS buy_x_same_product boolean DEFAULT false;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS buy_x_repeat boolean DEFAULT true;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS get_y_type get_y_type;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS get_y_applies_to get_y_applies_to;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS get_y_quantity integer;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS get_y_value numeric(10, 2);
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS get_y_max_rewards integer;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS shipping_scope shipping_scope;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS shipping_min_amount numeric(10, 2);
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS shipping_min_items integer;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS shipping_cap numeric(10, 2);
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS target_audience target_audience DEFAULT 'all' NOT NULL;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS geo_restriction geo_restriction DEFAULT 'none' NOT NULL;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS usage_per_customer integer;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS usage_per_day integer;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS usage_per_order integer;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS limit_new_customers boolean DEFAULT false NOT NULL;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS limit_returning_customers boolean DEFAULT false NOT NULL;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS total_usage_count integer DEFAULT 0 NOT NULL;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS total_discount_amount numeric(12, 2) DEFAULT 0 NOT NULL;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS total_orders_count integer DEFAULT 0 NOT NULL;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS admin_comment varchar(500);
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 3. CREATE NEW JUNCTION TABLES
CREATE TABLE IF NOT EXISTS discount_buy_x_collections (
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, collection_id)
);

CREATE TABLE IF NOT EXISTS discount_buy_x_products (
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, product_id)
);

CREATE TABLE IF NOT EXISTS discount_customers (
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, user_id)
);

CREATE TABLE IF NOT EXISTS discount_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  exclusion_type varchar(30) NOT NULL,
  exclusion_value varchar(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS discount_get_y_collections (
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, collection_id)
);

CREATE TABLE IF NOT EXISTS discount_get_y_products (
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, product_id)
);

CREATE TABLE IF NOT EXISTS discount_regions (
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  country_code varchar(3) NOT NULL,
  region_code varchar(10),
  PRIMARY KEY (discount_id, country_code)
);

CREATE TABLE IF NOT EXISTS discount_segments (
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  segment_id varchar(50) NOT NULL,
  PRIMARY KEY (discount_id, segment_id)
);

CREATE TABLE IF NOT EXISTS discount_shipping_methods (
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  shipping_method_id varchar(50) NOT NULL,
  PRIMARY KEY (discount_id, shipping_method_id)
);

CREATE TABLE IF NOT EXISTS discount_shipping_zones (
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  shipping_zone_id varchar(50) NOT NULL,
  PRIMARY KEY (discount_id, shipping_zone_id)
);

CREATE TABLE IF NOT EXISTS discount_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  usage_date timestamp NOT NULL,
  usage_count integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS discount_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id uuid REFERENCES discounts(id) ON DELETE SET NULL,
  discount_code varchar(50) REFERENCES discount_codes(code) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  guest_email varchar(255),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_number varchar(40),
  discount_type varchar(30) NOT NULL,
  discount_value numeric(10, 2),
  discount_amount numeric(12, 2) NOT NULL,
  order_subtotal numeric(12, 2),
  order_total numeric(12, 2),
  items_count integer,
  used_at timestamp DEFAULT now() NOT NULL
);

-- 4. CREATE INDEXES
CREATE INDEX IF NOT EXISTS discount_buy_x_collections_collection_id_idx ON discount_buy_x_collections(collection_id);
CREATE INDEX IF NOT EXISTS discount_buy_x_products_product_id_idx ON discount_buy_x_products(product_id);
CREATE INDEX IF NOT EXISTS discount_customers_user_id_idx ON discount_customers(user_id);
CREATE INDEX IF NOT EXISTS discount_exclusions_discount_id_idx ON discount_exclusions(discount_id);
CREATE INDEX IF NOT EXISTS discount_exclusions_type_idx ON discount_exclusions(exclusion_type);
CREATE INDEX IF NOT EXISTS discount_get_y_collections_collection_id_idx ON discount_get_y_collections(collection_id);
CREATE INDEX IF NOT EXISTS discount_get_y_products_product_id_idx ON discount_get_y_products(product_id);
CREATE INDEX IF NOT EXISTS discount_regions_country_code_idx ON discount_regions(country_code);
CREATE INDEX IF NOT EXISTS discount_segments_segment_id_idx ON discount_segments(segment_id);
CREATE INDEX IF NOT EXISTS discount_shipping_methods_method_id_idx ON discount_shipping_methods(shipping_method_id);
CREATE INDEX IF NOT EXISTS discount_shipping_zones_zone_id_idx ON discount_shipping_zones(shipping_zone_id);
CREATE INDEX IF NOT EXISTS discount_daily_usage_discount_date_idx ON discount_daily_usage(discount_id, usage_date);
CREATE INDEX IF NOT EXISTS discount_usage_discount_id_idx ON discount_usage(discount_id);
CREATE INDEX IF NOT EXISTS discount_usage_discount_code_idx ON discount_usage(discount_code);
CREATE INDEX IF NOT EXISTS discount_usage_user_id_idx ON discount_usage(user_id);
CREATE INDEX IF NOT EXISTS discount_usage_order_id_idx ON discount_usage(order_id);
CREATE INDEX IF NOT EXISTS discount_usage_used_at_idx ON discount_usage(used_at);
CREATE INDEX IF NOT EXISTS discount_usage_user_discount_idx ON discount_usage(user_id, discount_id);
CREATE INDEX IF NOT EXISTS discount_usage_user_code_idx ON discount_usage(user_id, discount_code);
CREATE INDEX IF NOT EXISTS discounts_is_deleted_idx ON discounts(is_deleted);
CREATE INDEX IF NOT EXISTS discounts_active_idx ON discounts(status, is_deleted, starts_at, ends_at);

-- 5. ADD CHECK CONSTRAINT (optional - may fail if data doesn't comply)
-- ALTER TABLE discounts ADD CONSTRAINT discounts_value_check CHECK (
--   (type IN ('free_shipping', 'buy_x_get_y')) OR 
--   (type IN ('percentage', 'fixed_amount') AND value IS NOT NULL)
-- );

-- 6. SET UP DRIZZLE MIGRATIONS TABLE FOR FUTURE USE
CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at BIGINT
);

-- Mark migrations 0-3 as complete
INSERT INTO __drizzle_migrations (hash, created_at) VALUES 
  ('0000_wooden_roland_deschain', 1767623979364),
  ('0001_amused_ben_urich', 1767703344192),
  ('0002_loose_magneto', 1767806701938),
  ('0003_outstanding_human_torch', 1767866072915)
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'Migration completed successfully!' as status;
