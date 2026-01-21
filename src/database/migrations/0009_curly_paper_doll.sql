-- =========================
-- ENUMS (SAFE / GUARDED)
-- =========================

DO $$ BEGIN
  CREATE TYPE "public"."entity_type" AS ENUM (
    'product',
    'blog',
    'category',
    'collection',
    'user',
    'brand',
    'vendor'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."media_type" AS ENUM (
    'image',
    'video',
    'document',
    'file'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint


-- =========================
-- TABLE (SAFE / GUARDED)
-- =========================

CREATE TABLE IF NOT EXISTS "entity_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" "entity_type" NOT NULL,
  "entity_id" uuid NOT NULL,
  "upload_id" integer NOT NULL,
  "media_type" "media_type" NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "alt_text" varchar(255),
  "caption" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint


-- =========================
-- FOREIGN KEY (SAFE)
-- =========================

DO $$ BEGIN
  ALTER TABLE "entity_media"
  ADD CONSTRAINT "entity_media_upload_id_uploads_id_fk"
  FOREIGN KEY ("upload_id")
  REFERENCES "public"."uploads"("id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint


-- =========================
-- INDEXES (SAFE / GUARDED)
-- =========================

CREATE INDEX IF NOT EXISTS "entity_media_entity_idx"
ON "entity_media" USING btree ("entity_type", "entity_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "entity_media_display_order_idx"
ON "entity_media" USING btree ("entity_type", "entity_id", "display_order");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "entity_media_upload_id_idx"
ON "entity_media" USING btree ("upload_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "entity_media_primary_idx"
ON "entity_media" USING btree ("entity_type", "entity_id", "is_primary");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "entity_media_type_idx"
ON "entity_media" USING btree ("entity_type", "entity_id", "media_type");
