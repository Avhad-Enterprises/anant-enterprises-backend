-- Add customer_id column to users table
-- Run this script in Supabase SQL Editor

-- Add the column
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id VARCHAR(15) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS users_customer_id_idx ON users (customer_id);

-- Success message
SELECT 'customer_id column added successfully!' as status;
