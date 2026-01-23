-- =====================================================
-- UUID v7 Support for PostgreSQL
-- =====================================================
--
-- This migration adds UUID v7 generation capability to PostgreSQL.
-- UUID v7 is a time-ordered UUID that provides better database performance
-- compared to random UUID v4.
--
-- Benefits:
-- - Sequential IDs reduce index fragmentation
-- - Better B-tree locality and caching
-- - 20-50% improvement in insert performance
-- - Can extract creation timestamp from ID
-- - Sortable by creation time
--
-- Reference: https://datatracker.ietf.org/doc/html/draft-peabody-dispatch-new-uuid-format
-- =====================================================

-- =====================================================
-- Create UUID v7 Generation Function
-- =====================================================

CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  -- Variables for UUID v7 generation
  unix_ts_ms BIGINT;
  uuid_bytes BYTEA;
BEGIN
  -- Get current Unix timestamp in milliseconds
  -- This provides the time-ordered component
  unix_ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  
  -- Generate UUID v7 bytes
  uuid_bytes := 
    -- First 48 bits: timestamp in milliseconds
    substring(int8send(unix_ts_ms) from 3) ||
    
    -- Next 4 bits: version (0111 = 7)
    -- Next 12 bits: random data
    -- Combined into 2 bytes with version marker
    set_byte(
      gen_random_bytes(2), 
      0, 
      (get_byte(gen_random_bytes(1), 0) & 15) | 112
    ) ||
    
    -- Next 2 bits: variant (10)
    -- Remaining 62 bits: random data
    -- Combined into 8 bytes with variant marker
    set_byte(
      gen_random_bytes(8), 
      0, 
      (get_byte(gen_random_bytes(1), 0) & 63) | 128
    );
    
  -- Convert bytes to UUID format
  RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================
-- Add Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION uuid_generate_v7() IS 
'Generate UUID v7 (time-ordered UUID with millisecond precision timestamp).
UUID v7 format:
- 48 bits: Unix timestamp (milliseconds)
- 4 bits: Version (0111 = 7)
- 12 bits: Random data
- 2 bits: Variant (10)
- 62 bits: Random data

Benefits over UUID v4:
- Time-ordered for better database performance
- Sequential inserts reduce index fragmentation
- Can extract creation timestamp
- Better B-tree locality

Example:
SELECT uuid_generate_v7(); -- 018d3f6c-7a2b-7f3c-8d9e-1a2b3c4d5e6f
';

-- =====================================================
-- Helper Function: Extract Timestamp from UUID v7
-- =====================================================

CREATE OR REPLACE FUNCTION uuid_v7_to_timestamptz(uuid_val UUID)
RETURNS TIMESTAMPTZ
AS $$
DECLARE
  uuid_bytes BYTEA;
  timestamp_bytes BYTEA;
  unix_ts_ms BIGINT;
BEGIN
  -- Convert UUID to bytes
  uuid_bytes := decode(replace(uuid_val::TEXT, '-', ''), 'hex');
  
  -- Extract first 6 bytes (48 bits) which contain the timestamp
  timestamp_bytes := substring(uuid_bytes from 1 for 6);
  
  -- Pad to 8 bytes for bigint conversion
  timestamp_bytes := '\x0000'::BYTEA || timestamp_bytes;
  
  -- Convert to bigint (milliseconds since epoch)
  unix_ts_ms := (get_byte(timestamp_bytes, 0)::BIGINT << 56) |
                (get_byte(timestamp_bytes, 1)::BIGINT << 48) |
                (get_byte(timestamp_bytes, 2)::BIGINT << 40) |
                (get_byte(timestamp_bytes, 3)::BIGINT << 32) |
                (get_byte(timestamp_bytes, 4)::BIGINT << 24) |
                (get_byte(timestamp_bytes, 5)::BIGINT << 16) |
                (get_byte(timestamp_bytes, 6)::BIGINT << 8) |
                (get_byte(timestamp_bytes, 7)::BIGINT);
  
  -- Convert milliseconds to timestamp
  RETURN to_timestamp(unix_ts_ms / 1000.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION uuid_v7_to_timestamptz(UUID) IS
'Extract the timestamp from a UUID v7.
Returns the creation time as a timestamptz.

Example:
SELECT uuid_v7_to_timestamptz(''018d3f6c-7a2b-7f3c-8d9e-1a2b3c4d5e6f'');
-- Returns: 2024-01-23 10:30:45.123+00
';

-- =====================================================
-- Helper Function: Check if UUID is v7
-- =====================================================

CREATE OR REPLACE FUNCTION is_uuid_v7(uuid_val UUID)
RETURNS BOOLEAN
AS $$
BEGIN
  -- Check if the version bits (13th hex character) equal 7
  RETURN substring(uuid_val::TEXT from 15 for 1) = '7';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_uuid_v7(UUID) IS
'Check if a UUID is version 7.

Example:
SELECT is_uuid_v7(''018d3f6c-7a2b-7f3c-8d9e-1a2b3c4d5e6f''); -- true
SELECT is_uuid_v7(''f47ac10b-58cc-4372-a567-0e02b2c3d479''); -- false (v4)
';

-- =====================================================
-- Test the Function (Commented out for production)
-- =====================================================

-- Uncomment to test during development:
-- DO $$
-- DECLARE
--   test_uuid UUID;
--   extracted_ts TIMESTAMPTZ;
-- BEGIN
--   -- Generate UUID v7
--   test_uuid := uuid_generate_v7();
--   RAISE NOTICE 'Generated UUID v7: %', test_uuid;
--   
--   -- Verify it's v7
--   RAISE NOTICE 'Is UUID v7: %', is_uuid_v7(test_uuid);
--   
--   -- Extract timestamp
--   extracted_ts := uuid_v7_to_timestamptz(test_uuid);
--   RAISE NOTICE 'Extracted timestamp: %', extracted_ts;
--   
--   -- Verify timestamp is recent (within last second)
--   IF extracted_ts > NOW() - INTERVAL '1 second' AND extracted_ts <= NOW() THEN
--     RAISE NOTICE 'SUCCESS: Timestamp is accurate!';
--   ELSE
--     RAISE WARNING 'WARNING: Timestamp seems incorrect';
--   END IF;
-- END $$;
