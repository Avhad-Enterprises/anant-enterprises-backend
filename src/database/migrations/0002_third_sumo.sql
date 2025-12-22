CREATE TYPE "public"."audit_action" AS ENUM('role_created', 'role_updated', 'role_deleted', 'permission_created', 'permission_assigned_to_role', 'permission_removed_from_role', 'role_assigned_to_user', 'role_removed_from_user');--> statement-breakpoint
CREATE TABLE "rbac_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" "audit_action" NOT NULL,
	"performed_by" integer,
	"target_type" varchar(50) NOT NULL,
	"target_id" integer NOT NULL,
	"target_name" varchar(100),
	"related_type" varchar(50),
	"related_id" integer,
	"related_name" varchar(100),
	"old_value" text,
	"new_value" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rbac_audit_logs" ADD CONSTRAINT "rbac_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;