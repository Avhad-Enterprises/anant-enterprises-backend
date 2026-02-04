-- Rollback Migration: Restore old user schema
-- Date: 2026-02-02
-- Description: Rollback script to restore name, customer_id, user_type fields
-- NOTE: This should only be used if the new schema causes critical issues

--> statement-breakpoint
-- Recreate user_type enum
CREATE TYPE "user_type" AS ENUM ('individual', 'business');
--> statement-breakpoint

-- Add back old fields
ALTER TABLE "users" ADD COLUMN "name" VARCHAR(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "customer_id" VARCHAR(15);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_type" user_type;
--> statement-breakpoint

-- Restore data from new fields back to old fields
UPDATE "users" 
SET 
  name = CONCAT(
    first_name, 
    CASE WHEN middle_name IS NOT NULL THEN ' ' || middle_name ELSE '' END,
    ' ',
    last_name
  ),
  customer_id = CASE 
    WHEN display_id LIKE 'CUST-%' THEN display_id 
    ELSE NULL 
  END,
  user_type = CASE
    WHEN EXISTS (SELECT 1 FROM customer_profiles WHERE user_id = users.id) THEN 'individual'::user_type
    WHEN EXISTS (SELECT 1 FROM business_customer_profiles WHERE user_id = users.id) THEN 'business'::user_type
    ELSE NULL
  END;
--> statement-breakpoint

-- Make name required
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint

-- Recreate unique constraint on customer_id
CREATE UNIQUE INDEX IF NOT EXISTS "users_customer_id_unique" ON "users" ("customer_id") WHERE customer_id IS NOT NULL;
--> statement-breakpoint

-- Recreate user_type index
CREATE INDEX IF NOT EXISTS "users_user_type_idx" ON "users" ("user_type");
--> statement-breakpoint

-- Drop new fields
ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "middle_name";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "display_id";
--> statement-breakpoint

-- Drop display_id sequence and trigger
DROP TRIGGER IF EXISTS trigger_generate_display_id ON users;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trigger_update_display_id ON users;
--> statement-breakpoint
DROP FUNCTION IF EXISTS generate_display_id();
--> statement-breakpoint
DROP SEQUENCE IF EXISTS display_id_seq;
--> statement-breakpoint

-- Drop display_id index
DROP INDEX IF EXISTS "users_display_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "users_display_id_unique";
