-- Migration: Data migration for user names
-- Date: 2026-02-02
-- Description: Split existing 'name' field into first_name, middle_name, last_name

--> statement-breakpoint
-- Split name into first_name and last_name
-- Strategy: First word -> first_name, rest -> last_name
UPDATE "users" 
SET 
  first_name = CASE 
    WHEN name IS NOT NULL AND TRIM(name) != '' THEN 
      SPLIT_PART(TRIM(name), ' ', 1)
    ELSE 
      'Unknown'
  END,
  last_name = CASE 
    WHEN name IS NOT NULL AND TRIM(name) != '' THEN
      CASE 
        -- If multiple words, take everything after first word
        WHEN ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(name), ' '), 1) > 1 THEN
          TRIM(SUBSTRING(TRIM(name) FROM POSITION(' ' IN TRIM(name)) + 1))
        -- If single word, use same as first name
        ELSE
          SPLIT_PART(TRIM(name), ' ', 1)
      END
    ELSE
      'Unknown'
  END
WHERE first_name IS NULL;
--> statement-breakpoint

-- Populate display_id from customer_id where it exists
UPDATE "users"
SET display_id = customer_id
WHERE customer_id IS NOT NULL AND display_id IS NULL;
--> statement-breakpoint

-- For users without customer_id, generate a USER-XXXXXX format display_id
UPDATE "users"
SET display_id = 'USER-' || UPPER(SUBSTRING(MD5(id::TEXT || RANDOM()::TEXT), 1, 6))
WHERE display_id IS NULL;
