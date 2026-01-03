ALTER TABLE "products" ALTER COLUMN "category_tier_1" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category_tier_2" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category_tier_3" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category_tier_4" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "role_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "permission_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand_name" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand_slug" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "highlights" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "specs" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_1_tiers_id_fk" FOREIGN KEY ("category_tier_1") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_2_tiers_id_fk" FOREIGN KEY ("category_tier_2") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_3_tiers_id_fk" FOREIGN KEY ("category_tier_3") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_tier_4_tiers_id_fk" FOREIGN KEY ("category_tier_4") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;