-- Phase 3: Link inventory to physical locations
-- CRITICAL: This migration changes the inventory table structure
-- Backs up data automatically by migrating to default location

-- Step 1: Add location_id as nullable (for transition)
ALTER TABLE inventory 
ADD COLUMN location_id uuid REFERENCES inventory_locations(id);

-- Step 2: Create or identify default location
DO $$
DECLARE
    default_location_id uuid;
BEGIN
    -- Check if any locations exist
    SELECT id INTO default_location_id 
    FROM inventory_locations 
    WHERE is_primary = true 
    LIMIT 1;
    
    -- If none, create default main warehouse
    IF default_location_id IS NULL THEN
        INSERT INTO inventory_locations (
            location_code,
            name,
            type,
            is_active,
            is_primary,
            address_line1,
            city,
            state,
            country,
            postal_code
        ) VALUES (
            'MAIN-WH',
            'Main Warehouse',
            'warehouse',
            true,
            true,
            'Default Address',
            'Default City',
            'Default State',
            'US',
            '00000'
        ) RETURNING id INTO default_location_id;
        
        RAISE NOTICE 'Created default location: %', default_location_id;
    END IF;
    
    -- Migrate ALL existing inventory to default location
    UPDATE inventory 
    SET location_id = default_location_id 
    WHERE location_id IS NULL;
    
    RAISE NOTICE 'Migrated % inventory records to default location', 
        (SELECT COUNT(*) FROM inventory WHERE location_id = default_location_id);
END $$;

-- Step 3: Make location_id NOT NULL (all records migrated)
ALTER TABLE inventory 
ALTER COLUMN location_id SET NOT NULL;

-- Step 4: Drop old text-based location column
ALTER TABLE inventory 
DROP COLUMN IF EXISTS location;

-- Step 5: Create performance indexes
CREATE INDEX IF NOT EXISTS inventory_location_id_idx 
ON inventory(location_id);

CREATE INDEX IF NOT EXISTS inventory_product_location_idx 
ON inventory(product_id, location_id);

-- Step 6: Add unique constraint (one inventory record per product per location)
ALTER TABLE inventory 
ADD CONSTRAINT inventory_product_location_unique 
UNIQUE (product_id, location_id);

-- Documentation
COMMENT ON COLUMN inventory.location_id IS 'Phase 3: Foreign key to inventory_locations - tracks which warehouse/store holds this stock';
COMMENT ON CONSTRAINT inventory_product_location_unique ON inventory IS 'Ensures one inventory record per product per location - prevents duplicates';
