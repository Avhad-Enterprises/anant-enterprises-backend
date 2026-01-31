ALTER TABLE "permissions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tiers" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "tiers" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "tiers" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "tiers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;