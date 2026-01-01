UPDATE "uploads" SET "deleted_by" = NULL;
ALTER TABLE "uploads" ALTER COLUMN "deleted_by" SET DATA TYPE uuid USING NULL;