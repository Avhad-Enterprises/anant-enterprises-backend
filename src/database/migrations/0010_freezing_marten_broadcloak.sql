-- =========================
-- ENUM DEFINITIONS (SAFE)
-- =========================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
        CREATE TYPE "public"."delivery_status" AS ENUM (
            'pending', 'sent', 'delivered', 'failed', 'bounced'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_frequency') THEN
        CREATE TYPE "public"."notification_frequency" AS ENUM (
            'immediate', 'daily_digest', 'weekly_digest', 'never'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
        CREATE TYPE "public"."notification_priority" AS ENUM (
            'low', 'normal', 'high', 'urgent'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE "public"."notification_type" AS ENUM (
            'order_created',
            'order_paid',
            'order_shipped',
            'order_delivered',
            'order_cancelled',
            'payment_authorized',
            'payment_captured',
            'payment_failed',
            'payment_refunded',
            'inventory_low_stock',
            'inventory_out_of_stock',
            'inventory_restocked',
            'user_welcome',
            'account_updated',
            'password_changed',
            'admin_broadcast',
            'system_alert',
            'promotion',
            'newsletter'
        );
    END IF;
END
$$;

-- =========================
-- TABLES
-- =========================

CREATE TABLE IF NOT EXISTS "notification_templates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" varchar(100) NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "category" varchar(50),
    "subject" varchar(255),
    "body_text" text,
    "body_html" text,
    "sms_template" text,
    "in_app_title" varchar(255),
    "in_app_message" text,
    "variables" jsonb DEFAULT '[]'::jsonb,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "notification_templates_code_unique" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "data" jsonb DEFAULT '{}'::jsonb,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamptz,
    "channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
    "priority" "notification_priority" DEFAULT 'normal' NOT NULL,
    "action_url" varchar(500),
    "action_text" varchar(100),
    "created_at" timestamptz DEFAULT now(),
    "expires_at" timestamptz,
    "deleted_at" timestamptz,
    "metadata" jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "notification_type" "notification_type" NOT NULL,
    "channel_email" boolean DEFAULT true NOT NULL,
    "channel_sms" boolean DEFAULT false NOT NULL,
    "channel_in_app" boolean DEFAULT true NOT NULL,
    "channel_push" boolean DEFAULT true NOT NULL,
    "frequency" "notification_frequency" DEFAULT 'immediate' NOT NULL,
    "quiet_hours_enabled" boolean DEFAULT false NOT NULL,
    "quiet_hours_start" time,
    "quiet_hours_end" time,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_delivery_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "notification_id" uuid NOT NULL,
    "channel" varchar(50) NOT NULL,
    "status" "delivery_status" DEFAULT 'pending' NOT NULL,
    "recipient" varchar(255),
    "provider" varchar(100),
    "provider_message_id" varchar(255),
    "provider_response" jsonb,
    "error_message" text,
    "error_code" varchar(50),
    "retry_count" integer DEFAULT 0,
    "sent_at" timestamptz,
    "delivered_at" timestamptz,
    "failed_at" timestamptz,
    "created_at" timestamptz DEFAULT now()
);

-- =========================
-- FOREIGN KEYS (SAFE)
-- =========================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notifications_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "notifications"
        ADD CONSTRAINT "notifications_user_id_users_id_fk"
        FOREIGN KEY ("user_id")
        REFERENCES "public"."users" ("id")
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notification_preferences_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "notification_preferences"
        ADD CONSTRAINT "notification_preferences_user_id_users_id_fk"
        FOREIGN KEY ("user_id")
        REFERENCES "public"."users" ("id")
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notification_delivery_logs_notification_id_notifications_id_fk'
    ) THEN
        ALTER TABLE "notification_delivery_logs"
        ADD CONSTRAINT "notification_delivery_logs_notification_id_notifications_id_fk"
        FOREIGN KEY ("notification_id")
        REFERENCES "public"."notifications" ("id")
        ON DELETE CASCADE;
    END IF;
END
$$;
