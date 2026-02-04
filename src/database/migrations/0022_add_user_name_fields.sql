-- Migration: Add new name fields to users table
-- Date: 2026-02-02
-- Description: Add first_name, middle_name, last_name fields to replace single 'name' field

--> statement-breakpoint
-- Add new name fields (nullable initially for data migration)
ALTER TABLE "users" ADD COLUMN "first_name" VARCHAR(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "middle_name" VARCHAR(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" VARCHAR(255);
--> statement-breakpoint

-- Add display_id field (nullable initially, will be populated via trigger)
ALTER TABLE "users" ADD COLUMN "display_id" VARCHAR(20);
--> statement-breakpoint

-- Make customer_id and user_type nullable (preparing for deprecation)
ALTER TABLE "users" ALTER COLUMN "customer_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_type" DROP NOT NULL;
