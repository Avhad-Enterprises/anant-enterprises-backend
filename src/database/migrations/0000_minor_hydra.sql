CREATE TABLE "invitation" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"invite_token" varchar(64) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_role" text,
	"temp_password_encrypted" text,
	"password_hash" varchar(255),
	"verify_attempts" integer DEFAULT 0 NOT NULL,
	"invited_by" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp,
	CONSTRAINT "invitation_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "chatbot_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" bigint NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"is_embedded" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chatbot_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chatbot_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" bigint NOT NULL,
	"file_path" text NOT NULL,
	"file_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"phone_number" varchar(20),
	"role" text DEFAULT 'scientist' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_documents" ADD CONSTRAINT "chatbot_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_session_id_chatbot_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chatbot_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_invite_token_idx" ON "invitation" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "invitation_email_is_deleted_idx" ON "invitation" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "invitation_status_is_deleted_idx" ON "invitation" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE INDEX "invitation_expires_at_idx" ON "invitation" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "invitation_invited_by_idx" ON "invitation" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "chatbot_documents_status_is_deleted_idx" ON "chatbot_documents" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE INDEX "chatbot_documents_created_at_idx" ON "chatbot_documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chatbot_messages_session_id_is_deleted_idx" ON "chatbot_messages" USING btree ("session_id","is_deleted");--> statement-breakpoint
CREATE INDEX "chatbot_messages_created_at_idx" ON "chatbot_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chatbot_sessions_user_id_is_deleted_idx" ON "chatbot_sessions" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "chatbot_sessions_created_at_idx" ON "chatbot_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "uploads_user_id_is_deleted_idx" ON "uploads" USING btree ("user_id","is_deleted");--> statement-breakpoint
CREATE INDEX "uploads_status_idx" ON "uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "uploads_mime_type_idx" ON "uploads" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "uploads_created_at_idx" ON "uploads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_email_is_deleted_idx" ON "users" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "users_role_is_deleted_idx" ON "users" USING btree ("role","is_deleted");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");