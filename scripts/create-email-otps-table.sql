-- Create email_otps table for OTP verification
-- Run this script in Supabase SQL Editor or using psql

CREATE TABLE IF NOT EXISTS "email_otps" (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "email_otps_email_idx" ON "email_otps" USING btree ("email");
CREATE INDEX IF NOT EXISTS "email_otps_expires_at_idx" ON "email_otps" USING btree ("expires_at");

-- Success message
SELECT 'email_otps table created successfully!' as status;
