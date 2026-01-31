-- Add delivery_price and return_amount fields to orders table
-- Migration: add_delivery_price_and_return_amount_to_orders
-- Date: 2026-01-28

-- Add delivery_price field (for frontend display of delivery charges)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(12, 2) DEFAULT 0.00 NOT NULL;

-- Add return_amount field (for tracking return/refund amounts)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN orders.delivery_price IS 'Delivery/shipping price charged to customer (for display)';
COMMENT ON COLUMN orders.return_amount IS 'Amount refunded for returns';
