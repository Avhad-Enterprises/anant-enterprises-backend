-- Clear existing audit data (integer values cannot be converted to UUID)
UPDATE "bundles" SET "created_by" = NULL WHERE "created_by" IS NOT NULL;
UPDATE "products" SET "created_by" = NULL, "updated_by" = NULL, "deleted_by" = NULL WHERE "created_by" IS NOT NULL OR "updated_by" IS NOT NULL OR "deleted_by" IS NOT NULL;
UPDATE "roles" SET "created_by" = NULL, "updated_by" = NULL, "deleted_by" = NULL WHERE "created_by" IS NOT NULL OR "updated_by" IS NOT NULL OR "deleted_by" IS NOT NULL;
UPDATE "users" SET "created_by" = NULL, "updated_by" = NULL, "deleted_by" = NULL WHERE "created_by" IS NOT NULL OR "updated_by" IS NOT NULL OR "deleted_by" IS NOT NULL;-->statement-breakpoint

-- Convert audit fields to UUID
ALTER TABLE "bundles" ALTER COLUMN "created_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "created_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "deleted_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "created_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "deleted_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "deleted_by" SET DATA TYPE uuid USING NULL;-->statement-breakpoint

-- Add missing audit fields to bundles
ALTER TABLE "bundles" ADD COLUMN "updated_by" uuid;-->statement-breakpoint
ALTER TABLE "bundles" ADD COLUMN "deleted_by" uuid;-->statement-breakpoint
ALTER TABLE "bundles" ADD COLUMN "deleted_at" timestamp;