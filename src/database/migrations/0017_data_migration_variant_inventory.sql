-- ============================================
-- Phase 2A: Variant Inventory Data Migration
-- ============================================
-- This migration moves inventory data from product_variants.inventory_quantity
-- to the unified inventory table with variant_id support
--
-- Run AFTER 0017_left_daredevil.sql
--
-- Author: System Generated
-- Date: 31 January 2026
-- ============================================

-- Step 1: Create inventory records for all product variants with inventory
-- Uses the default location for all variants
-- Copies product name from parent product + variant option value
INSERT INTO inventory (
  id,
  product_id,
  variant_id,
  location_id,
  product_name,
  sku,
  available_quantity,
  reserved_quantity,
  incoming_quantity,
  condition,
  status,
  created_at,
  updated_at
)
SELECT 
  uuid_generate_v7() as id,
  NULL as product_id,  -- NULL because this is variant inventory
  pv.id as variant_id,
  (SELECT id FROM inventory_locations WHERE is_default = true LIMIT 1) as location_id,
  p.product_title || ' - ' || pv.option_value as product_name,
  pv.sku,
  pv.inventory_quantity as available_quantity,
  0 as reserved_quantity,  -- Variants don't track reserved separately yet
  0 as incoming_quantity,
  'sellable' as condition,
  CASE 
    WHEN pv.inventory_quantity > 10 THEN 'in_stock'::inventory_status
    WHEN pv.inventory_quantity > 0 THEN 'low_stock'::inventory_status
    ELSE 'out_of_stock'::inventory_status
  END as status,
  pv.created_at,
  pv.updated_at
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE pv.is_deleted = false
  AND pv.inventory_quantity > 0;  -- Only migrate variants with actual inventory

-- Step 2: Verify migration
-- Check that all variants with inventory now have inventory records
DO $$
DECLARE
  variant_count INTEGER;
  inventory_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO variant_count 
  FROM product_variants 
  WHERE is_deleted = false AND inventory_quantity > 0;
  
  SELECT COUNT(*) INTO inventory_count
  FROM inventory
  WHERE variant_id IS NOT NULL;
  
  RAISE NOTICE 'Product variants with inventory: %', variant_count;
  RAISE NOTICE 'Inventory records for variants: %', inventory_count;
  
  IF variant_count != inventory_count THEN
    RAISE WARNING 'Mismatch: % variants with inventory but % inventory records created', variant_count, inventory_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All variant inventory migrated successfully';
  END IF;
END $$;

-- Step 3: Create inventory records for variants with zero inventory (optional)
-- This ensures all active variants have inventory tracking enabled
-- Comment out if you only want to track variants with actual stock
/*
INSERT INTO inventory (
  id,
  product_id,
  variant_id,
  location_id,
  product_name,
  sku,
  available_quantity,
  reserved_quantity,
  incoming_quantity,
  condition,
  status,
  created_at,
  updated_at
)
SELECT 
  uuid_generate_v7() as id,
  NULL as product_id,
  pv.id as variant_id,
  (SELECT id FROM inventory_locations WHERE is_default = true LIMIT 1) as location_id,
  p.product_title || ' - ' || pv.option_value as product_name,
  pv.sku,
  0 as available_quantity,
  0 as reserved_quantity,
  0 as incoming_quantity,
  'sellable' as condition,
  'out_of_stock'::inventory_status as status,
  pv.created_at,
  pv.updated_at
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE pv.is_deleted = false
  AND pv.inventory_quantity = 0
  AND NOT EXISTS (
    SELECT 1 FROM inventory WHERE variant_id = pv.id
  );
*/

-- Step 4: Migrate variant_inventory_adjustments to inventory_adjustments
-- Maps variant adjustments to the new inventory records
INSERT INTO inventory_adjustments (
  id,
  inventory_id,
  adjustment_type,
  quantity_change,
  reason,
  reference_number,
  quantity_before,
  quantity_after,
  adjusted_by,
  adjusted_at,
  approved_by,
  approved_at,
  approval_status,
  notes
)
SELECT 
  via.id,
  i.id as inventory_id,
  via.adjustment_type,
  via.quantity_change,
  via.reason,
  via.reference_number,
  via.quantity_before,
  via.quantity_after,
  via.adjusted_by,
  via.adjusted_at,
  NULL as approved_by,  -- variant adjustments didn't have approval workflow
  via.adjusted_at as approved_at,  -- Consider them auto-approved
  'approved'::approval_status,
  via.notes
FROM variant_inventory_adjustments via
JOIN inventory i ON i.variant_id = via.variant_id
WHERE i.variant_id IS NOT NULL;

-- Step 5: Verify adjustment migration
DO $$
DECLARE
  variant_adj_count INTEGER;
  migrated_adj_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO variant_adj_count FROM variant_inventory_adjustments;
  
  SELECT COUNT(*) INTO migrated_adj_count
  FROM inventory_adjustments ia
  JOIN inventory i ON ia.inventory_id = i.id
  WHERE i.variant_id IS NOT NULL;
  
  RAISE NOTICE 'Original variant adjustments: %', variant_adj_count;
  RAISE NOTICE 'Migrated adjustments: %', migrated_adj_count;
  
  IF variant_adj_count != migrated_adj_count THEN
    RAISE WARNING 'Mismatch: % variant adjustments but % migrated', variant_adj_count, migrated_adj_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All variant adjustments migrated successfully';
  END IF;
END $$;

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
-- If you need to rollback this migration:
--
-- 1. Restore product_variants.inventory_quantity:
--    UPDATE product_variants pv
--    SET inventory_quantity = COALESCE((
--      SELECT SUM(available_quantity) 
--      FROM inventory 
--      WHERE variant_id = pv.id
--    ), 0);
--
-- 2. Delete migrated inventory records:
--    DELETE FROM inventory WHERE variant_id IS NOT NULL;
--
-- 3. Restore variant_inventory_adjustments (manual restore from backup)
--
-- ============================================
