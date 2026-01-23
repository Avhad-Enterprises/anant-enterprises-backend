-- Add last_name column to users table
-- Run this script in Supabase SQL Editor

-- Add the column (NOT NULL with default empty string, then update existing records)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

-- Update existing records to have a default value (split from name if possible)
UPDATE users SET last_name = '' WHERE last_name IS NULL;

-- Now make it NOT NULL
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;

-- Success message
SELECT 'last_name column added successfully!' as status;
