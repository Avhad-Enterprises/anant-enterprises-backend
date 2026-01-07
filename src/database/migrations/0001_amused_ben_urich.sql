CREATE TYPE "public"."payment_transaction_status" AS ENUM('initiated', 'authorized', 'captured', 'failed', 'refund_initiated', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"razorpay_order_id" varchar(50) NOT NULL,
	"razorpay_payment_id" varchar(50),
	"razorpay_signature" varchar(256),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "payment_transaction_status" DEFAULT 'initiated' NOT NULL,
	"payment_method" varchar(50),
	"payment_method_details" jsonb,
	"error_code" varchar(50),
	"error_description" varchar(500),
	"error_source" varchar(50),
	"error_step" varchar(50),
	"error_reason" varchar(200),
	"refund_id" varchar(50),
	"refund_amount" numeric(12, 2),
	"refund_reason" varchar(200),
	"refunded_at" timestamp,
	"webhook_verified" boolean DEFAULT false NOT NULL,
	"webhook_received_at" timestamp,
	"idempotency_key" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp,
	CONSTRAINT "payment_transactions_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_tx_valid_amount" CHECK (amount > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(100),
	"event_type" varchar(100) NOT NULL,
	"razorpay_order_id" varchar(50),
	"razorpay_payment_id" varchar(50),
	"raw_payload" jsonb NOT NULL,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp,
	"processing_error" varchar(500),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_webhook_logs_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "razorpay_order_id" varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_link_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "last_payment_error" varchar(500);--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_tx_order_id_idx" ON "payment_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_tx_rp_order_id_idx" ON "payment_transactions" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "payment_tx_rp_payment_id_idx" ON "payment_transactions" USING btree ("razorpay_payment_id");--> statement-breakpoint
CREATE INDEX "payment_tx_status_idx" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_tx_created_at_idx" ON "payment_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_logs_event_type_idx" ON "payment_webhook_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_logs_rp_order_idx" ON "payment_webhook_logs" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_rp_payment_idx" ON "payment_webhook_logs" USING btree ("razorpay_payment_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_processed_idx" ON "payment_webhook_logs" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "webhook_logs_received_at_idx" ON "payment_webhook_logs" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "orders_razorpay_order_id_idx" ON "orders" USING btree ("razorpay_order_id");