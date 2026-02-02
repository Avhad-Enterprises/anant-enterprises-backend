-- Migration: Create sequence and trigger for display_id auto-generation
-- Date: 2026-02-02
-- Description: Auto-generate display_id for new users based on their profile type

--> statement-breakpoint
-- Create sequence for display_id generation (starts at 100000 for 6-digit codes)
CREATE SEQUENCE IF NOT EXISTS display_id_seq START 100000;
--> statement-breakpoint

-- Create function to generate display_id based on user profile
CREATE OR REPLACE FUNCTION generate_display_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if display_id is NULL
  IF NEW.display_id IS NULL THEN
    -- Check if user has customer profile
    IF EXISTS (SELECT 1 FROM customer_profiles WHERE user_id = NEW.id) THEN
      NEW.display_id := 'CUST-' || LPAD(NEXTVAL('display_id_seq')::TEXT, 6, '0');
    -- Check if user has admin profile
    ELSIF EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = NEW.id) THEN
      NEW.display_id := 'EMP-' || LPAD(NEXTVAL('display_id_seq')::TEXT, 6, '0');
    -- Default to USER prefix
    ELSE
      NEW.display_id := 'USER-' || LPAD(NEXTVAL('display_id_seq')::TEXT, 6, '0');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- Create trigger to auto-generate display_id on INSERT
CREATE TRIGGER trigger_generate_display_id
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_display_id();
--> statement-breakpoint

-- Create trigger to auto-generate display_id on UPDATE (if still NULL)
CREATE TRIGGER trigger_update_display_id
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.display_id IS NULL AND OLD.display_id IS NULL)
  EXECUTE FUNCTION generate_display_id();
