ALTER TABLE "rbac_audit_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "rbac_audit_logs" CASCADE;--> statement-breakpoint
DROP INDEX "users_role_is_deleted_idx";--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "assigned_role_id" integer;--> statement-breakpoint
ALTER TABLE "invitation" DROP COLUMN "assigned_role";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
DROP TYPE "public"."audit_action";