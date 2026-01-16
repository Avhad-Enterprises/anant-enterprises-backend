-- Phase 3: Location allocation rules for smart fulfillment
-- Defines how to select warehouses for order fulfillment

CREATE TABLE IF NOT EXISTS location_allocation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rule metadata
    rule_name varchar(100) NOT NULL,
    priority integer NOT NULL DEFAULT 100, -- Lower number = higher priority
    is_active boolean DEFAULT true NOT NULL,
    
    -- Conditions (JSON for flexibility)
    -- Example: {"shipping_zone": "east", "product_category": "electronics", "min_order_value": 100}
    conditions jsonb NOT NULL DEFAULT '{}',
    
    -- Allocation strategy
    strategy varchar(50) NOT NULL DEFAULT 'nearest',
    -- Options: 'nearest', 'lowest_cost', 'highest_stock', 'round_robin', 'manual'
    
    -- Target locations (ordered by preference)
    location_ids uuid[] NOT NULL,
    
    -- Fallback behavior if no location has stock
    fallback_strategy varchar(50) DEFAULT 'any_available',
    -- Options: 'any_available', 'split_order', 'backorder', 'cancel'
    
    -- Audit
    created_at timestamp DEFAULT NOW() NOT NULL,
    updated_at timestamp DEFAULT NOW() NOT NULL,
    created_by uuid,
    updated_by uuid,
    
    CONSTRAINT priority_positive CHECK (priority > 0)
);

CREATE INDEX IF NOT EXISTS location_allocation_rules_priority_idx 
ON location_allocation_rules(priority) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS location_allocation_rules_active_idx 
ON location_allocation_rules(is_active);

-- Insert default rule: use primary warehouse for everything
INSERT INTO location_allocation_rules (
    rule_name,
    priority,
    strategy,
    location_ids,
    conditions
) 
SELECT 
    'Default - Primary Warehouse',
    999, -- Low priority (fallback)
    'manual',
    ARRAY[id],
    '{}'::jsonb
FROM inventory_locations 
WHERE is_primary = true 
LIMIT 1;

-- Documentation
COMMENT ON TABLE location_allocation_rules IS 'Phase 3: Rules for selecting which warehouse fulfills orders';
COMMENT ON COLUMN location_allocation_rules.strategy IS 'nearest=closest to customer, lowest_cost=cheapest shipping, highest_stock=most inventory, manual=specific locations only';
COMMENT ON COLUMN location_allocation_rules.conditions IS 'JSON conditions to match orders (e.g., shipping zone, product type, order value)';
