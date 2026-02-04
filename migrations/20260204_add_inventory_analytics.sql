-- PHASE 1: Add Analytics and Debugging Fields to Inventory Table
-- Migration: Add total_sold, total_fulfilled, last_stock_movement_at, last_sale_at
-- Author: System
-- Date: 2026-02-04

-- Add new columns
ALTER TABLE inventory 
  ADD COLUMN total_sold INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN total_fulfilled INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN last_stock_movement_at TIMESTAMP,
  ADD COLUMN last_sale_at TIMESTAMP;

-- Add check constraints for data validation
ALTER TABLE inventory
  ADD CONSTRAINT inventory_total_sold_check CHECK (total_sold >= 0),
  ADD CONSTRAINT inventory_total_fulfilled_check CHECK (total_fulfilled >= 0);

-- Create performance indexes for analytics queries
CREATE INDEX inventory_last_sale_idx ON inventory(last_sale_at) WHERE last_sale_at IS NOT NULL;
CREATE INDEX inventory_last_movement_idx ON inventory(last_stock_movement_at);

-- Add comments for documentation
COMMENT ON COLUMN inventory.total_sold IS 'Cumulative count of units sold (incremented when orders ship)';
COMMENT ON COLUMN inventory.total_fulfilled IS 'Cumulative count of fulfilled order items';
COMMENT ON COLUMN inventory.last_stock_movement_at IS 'Timestamp of last inventory movement (reservation, adjustment, fulfillment, return)';
COMMENT ON COLUMN inventory.last_sale_at IS 'Timestamp of last sale (order shipped) - used for stale inventory reports';
