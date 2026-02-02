-- Migration: Add constraints to new user fields
-- Date: 2026-02-02
-- Description: Make first_name and last_name NOT NULL, add unique constraint on display_id

--> statement-breakpoint
-- Make first_name required (after data migration)
ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;
--> statement-breakpoint

-- Make last_name required (after data migration)
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;
--> statement-breakpoint

-- Add unique constraint on display_id
ALTER TABLE "users" ADD CONSTRAINT "users_display_id_unique" UNIQUE("display_id");
--> statement-breakpoint

-- Add index on display_id for fast lookups
CREATE INDEX IF NOT EXISTS "users_display_id_idx" ON "users" ("display_id");
