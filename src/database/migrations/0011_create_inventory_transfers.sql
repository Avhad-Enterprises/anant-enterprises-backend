-- Phase 3: Inventory transfers between locations
-- Track stock movements with full audit trail

CREATE TABLE IF NOT EXISTS inventory_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transfer metadata
    transfer_number varchar(50) UNIQUE NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'pending',
    -- Status: pending, in_transit, completed, cancelled
    
    -- Locations
    from_location_id uuid REFERENCES inventory_locations(id) NOT NULL,
    to_location_id uuid REFERENCES inventory_locations(id) NOT NULL,
    
    -- Product & quantity
    product_id uuid REFERENCES products(id) NOT NULL,
    quantity integer NOT NULL,
    
    -- Tracking & timestamps
    shipment_tracking varchar(200),
    shipped_at timestamp,
    received_at timestamp,
    completed_at timestamp,
    cancelled_at timestamp,
    
    -- Reason & notes
    reason varchar(50),
    -- Common: 'rebalancing', 'customer_order', 'return', 'manual', 'damaged', 'quality_hold'
    notes text,
    
    -- Related records
    related_order_id uuid REFERENCES orders(id),
    
    -- Audit
    created_at timestamp DEFAULT NOW() NOT NULL,
    updated_at timestamp DEFAULT NOW() NOT NULL,
    created_by uuid,
    updated_by uuid,
    
    -- Constraints
    CONSTRAINT transfer_different_locations CHECK (from_location_id != to_location_id),
    CONSTRAINT transfer_quantity_positive CHECK (quantity > 0)
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS inventory_transfers_status_idx 
ON inventory_transfers(status);

CREATE INDEX IF NOT EXISTS inventory_transfers_from_location_idx 
ON inventory_transfers(from_location_id);

CREATE INDEX IF NOT EXISTS inventory_transfers_to_location_idx 
ON inventory_transfers(to_location_id);

CREATE INDEX IF NOT EXISTS inventory_transfers_product_idx 
ON inventory_transfers(product_id);

CREATE INDEX IF NOT EXISTS inventory_transfers_created_at_idx 
ON inventory_transfers(created_at DESC);

-- Documentation
COMMENT ON TABLE inventory_transfers IS 'Phase 3: Stock movements between warehouses/stores with audit trail';
COMMENT ON COLUMN inventory_transfers.transfer_number IS 'Unique identifier for tracking (e.g., TR-20260116-ABC123)';
COMMENT ON COLUMN inventory_transfers.reason IS 'Why transfer initiated: rebalancing, customer order, return, etc.';
