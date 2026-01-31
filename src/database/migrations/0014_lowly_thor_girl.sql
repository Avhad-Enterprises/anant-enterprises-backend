ALTER TABLE "bundle_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bundles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "catalogue_product_overrides" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "catalogue_rules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "catalogues" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chatbot_documents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chatbot_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "company_rules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "companies" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_buy_x_collections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_buy_x_products" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_customers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_get_y_collections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_get_y_products" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_regions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_shipping_methods" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_shipping_zones" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_codes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_collections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_products" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_usage" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discounts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "faqs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gift_card_templates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gift_cards" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_transfers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "location_allocation_rules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "production_orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "entity_media" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "currencies" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "countries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "regions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tax_rules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tickets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "business_customer_profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_statistics" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_payment_methods" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "bundle_items" CASCADE;--> statement-breakpoint
DROP TABLE "bundles" CASCADE;--> statement-breakpoint
DROP TABLE "catalogue_product_overrides" CASCADE;--> statement-breakpoint
DROP TABLE "catalogue_rules" CASCADE;--> statement-breakpoint
DROP TABLE "catalogues" CASCADE;--> statement-breakpoint
DROP TABLE "chatbot_documents" CASCADE;--> statement-breakpoint
DROP TABLE "chatbot_messages" CASCADE;--> statement-breakpoint
DROP TABLE "chatbot_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "company_rules" CASCADE;--> statement-breakpoint
DROP TABLE "companies" CASCADE;--> statement-breakpoint
DROP TABLE "discount_buy_x_collections" CASCADE;--> statement-breakpoint
DROP TABLE "discount_buy_x_products" CASCADE;--> statement-breakpoint
DROP TABLE "discount_customers" CASCADE;--> statement-breakpoint
DROP TABLE "discount_get_y_collections" CASCADE;--> statement-breakpoint
DROP TABLE "discount_get_y_products" CASCADE;--> statement-breakpoint
DROP TABLE "discount_regions" CASCADE;--> statement-breakpoint
DROP TABLE "discount_shipping_methods" CASCADE;--> statement-breakpoint
DROP TABLE "discount_shipping_zones" CASCADE;--> statement-breakpoint
DROP TABLE "discount_codes" CASCADE;--> statement-breakpoint
DROP TABLE "discount_collections" CASCADE;--> statement-breakpoint
DROP TABLE "discount_products" CASCADE;--> statement-breakpoint
DROP TABLE "discount_usage" CASCADE;--> statement-breakpoint
DROP TABLE "discounts" CASCADE;--> statement-breakpoint
DROP TABLE "faqs" CASCADE;--> statement-breakpoint
DROP TABLE "gift_card_templates" CASCADE;--> statement-breakpoint
DROP TABLE "gift_card_transactions" CASCADE;--> statement-breakpoint
DROP TABLE "gift_cards" CASCADE;--> statement-breakpoint
DROP TABLE "inventory_transfers" CASCADE;--> statement-breakpoint
DROP TABLE "location_allocation_rules" CASCADE;--> statement-breakpoint
DROP TABLE "production_orders" CASCADE;--> statement-breakpoint
DROP TABLE "entity_media" CASCADE;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
DROP TABLE "currencies" CASCADE;--> statement-breakpoint
DROP TABLE "countries" CASCADE;--> statement-breakpoint
DROP TABLE "regions" CASCADE;--> statement-breakpoint
DROP TABLE "tax_rules" CASCADE;--> statement-breakpoint
DROP TABLE "ticket_messages" CASCADE;--> statement-breakpoint
DROP TABLE "tickets" CASCADE;--> statement-breakpoint
DROP TABLE "business_customer_profiles" CASCADE;--> statement-breakpoint
DROP TABLE "customer_statistics" CASCADE;--> statement-breakpoint
DROP TABLE "user_payment_methods" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_discount_id_discounts_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_discount_code_id_discount_codes_code_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_tax_rule_id_tax_rules_id_fk";
--> statement-breakpoint
DROP TYPE "public"."bundle_status";--> statement-breakpoint
DROP TYPE "public"."bundle_type";--> statement-breakpoint
DROP TYPE "public"."catalogue_adjustment_type";--> statement-breakpoint
DROP TYPE "public"."catalogue_rule_match_type";--> statement-breakpoint
DROP TYPE "public"."catalogue_status";--> statement-breakpoint
DROP TYPE "public"."company_match_type";--> statement-breakpoint
DROP TYPE "public"."company_user_assignment_type";--> statement-breakpoint
DROP TYPE "public"."buy_x_trigger_type";--> statement-breakpoint
DROP TYPE "public"."discount_applies_to";--> statement-breakpoint
DROP TYPE "public"."discount_status";--> statement-breakpoint
DROP TYPE "public"."discount_type";--> statement-breakpoint
DROP TYPE "public"."geo_restriction";--> statement-breakpoint
DROP TYPE "public"."get_y_applies_to";--> statement-breakpoint
DROP TYPE "public"."get_y_type";--> statement-breakpoint
DROP TYPE "public"."discount_min_requirement_type";--> statement-breakpoint
DROP TYPE "public"."shipping_scope";--> statement-breakpoint
DROP TYPE "public"."target_audience";--> statement-breakpoint
DROP TYPE "public"."faq_target_type";--> statement-breakpoint
DROP TYPE "public"."gift_card_character_set";--> statement-breakpoint
DROP TYPE "public"."gift_card_transaction_type";--> statement-breakpoint
DROP TYPE "public"."gift_card_delivery_method";--> statement-breakpoint
DROP TYPE "public"."gift_card_source";--> statement-breakpoint
DROP TYPE "public"."gift_card_status";--> statement-breakpoint
DROP TYPE "public"."production_priority";--> statement-breakpoint
DROP TYPE "public"."production_status";--> statement-breakpoint
DROP TYPE "public"."entity_type";--> statement-breakpoint
DROP TYPE "public"."media_type";--> statement-breakpoint
DROP TYPE "public"."tax_applies_to";--> statement-breakpoint
DROP TYPE "public"."tax_type";--> statement-breakpoint
DROP TYPE "public"."ticket_message_sender_type";--> statement-breakpoint
DROP TYPE "public"."ticket_channel";--> statement-breakpoint
DROP TYPE "public"."ticket_priority";--> statement-breakpoint
DROP TYPE "public"."ticket_source";--> statement-breakpoint
DROP TYPE "public"."ticket_status";--> statement-breakpoint
DROP TYPE "public"."business_account_status";--> statement-breakpoint
DROP TYPE "public"."business_tier";--> statement-breakpoint
DROP TYPE "public"."business_type";--> statement-breakpoint
DROP TYPE "public"."payment_terms";--> statement-breakpoint
DROP TYPE "public"."card_funding";--> statement-breakpoint
DROP TYPE "public"."payment_type";