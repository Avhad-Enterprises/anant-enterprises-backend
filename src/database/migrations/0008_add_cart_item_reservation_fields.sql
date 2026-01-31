-- Add reservation tracking fields to cart_items table for Phase 2
-- This enables automatic stock reservation when items added to cart

ALTER TABLE cart_items 
ADD COLUMN reservation_id uuid,
ADD COLUMN reserved_at timestamp,
ADD COLUMN reservation_expires_at timestamp;

-- Indexes for efficient cleanup queries
CREATE INDEX cart_items_reservation_expires_idx 
ON cart_items(reservation_expires_at) 
WHERE reservation_expires_at IS NOT NULL;

CREATE INDEX cart_items_reservation_active_idx 
ON cart_items(product_id, reservation_expires_at)
WHERE reservation_expires_at > NOW();

-- Column comments for documentation
COMMENT ON COLUMN cart_items.reservation_id IS 'Unique identifier for this reservation (for tracking/debugging)';
COMMENT ON COLUMN cart_items.reserved_at IS 'Timestamp when stock was reserved for this cart item';
COMMENT ON COLUMN cart_items.reservation_expires_at IS 'Timestamp when reservation expires (typically 30 mins from reserved_at)';
