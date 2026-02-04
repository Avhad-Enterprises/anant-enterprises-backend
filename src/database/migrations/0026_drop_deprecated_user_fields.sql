-- Migration: Drop deprecated user fields
-- Date: 2026-02-02
-- Description: Remove old 'name', 'customer_id', and 'user_type' fields
-- WARNING: Run this only after thorough testing and confirming all code uses new fields

--> statement-breakpoint
-- Drop old name field (replaced by first_name, middle_name, last_name)
ALTER TABLE "users" DROP COLUMN IF EXISTS "name";
--> statement-breakpoint

-- Drop customer_id field (replaced by display_id)
ALTER TABLE "users" DROP COLUMN IF EXISTS "customer_id";
--> statement-breakpoint

-- Drop user_type field (now determined by profile table existence)
ALTER TABLE "users" DROP COLUMN IF EXISTS "user_type";
--> statement-breakpoint

-- Drop the user_type enum (no longer needed)
DROP TYPE IF EXISTS "user_type";
--> statement-breakpoint

-- Remove old index on user_type if it exists
DROP INDEX IF EXISTS "users_user_type_idx";
