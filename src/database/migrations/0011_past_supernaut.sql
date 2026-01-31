CREATE TABLE "email_otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_code" varchar(6) NOT NULL,
	"purpose" varchar(50) DEFAULT 'email_verification' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "additional_thumbnails" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE INDEX "email_otps_email_idx" ON "email_otps" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_otps_expires_at_idx" ON "email_otps" USING btree ("expires_at");