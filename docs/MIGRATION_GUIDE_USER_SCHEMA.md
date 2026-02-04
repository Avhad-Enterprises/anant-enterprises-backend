# User Schema Migration Guide

**Date:** February 2, 2026  
**Migration Numbers:** 0022 - 0027  
**Purpose:** Migrate from single `name` field to structured `first_name`, `middle_name`, `last_name` and introduce auto-generated `display_id`

---

## 🎯 Migration Overview

This migration series transforms the user schema from a simple name field to a structured naming system with auto-generated human-readable IDs.

### Changes:
1. **New Fields:** `first_name`, `middle_name`, `last_name`, `display_id`
2. **Deprecated Fields:** `name`, `customer_id`, `user_type`
3. **Auto-generation:** `display_id` now auto-generated via database trigger
4. **Profile Detection:** User type now inferred from profile table existence

---

## 📋 Migration Files (Execute in Order)

### **0022_add_user_name_fields.sql** - Add New Fields
- Adds `first_name`, `middle_name`, `last_name` (nullable initially)
- Adds `display_id` field (nullable initially)
- Makes `customer_id` and `user_type` nullable (preparing for removal)

**Status:** ✅ Safe to run on production

---

### **0023_data_migration_user_names.sql** - Migrate Data
- Splits existing `name` into `first_name` and `last_name`
- Strategy: First word → first_name, remaining → last_name
- Populates `display_id` from existing `customer_id` where available
- Generates `USER-XXXXXX` format for users without customer_id
- Handles NULL/empty names with 'Unknown' fallback

**Status:** ✅ Safe to run, handles edge cases

**Examples:**
- "John Doe" → first_name: "John", last_name: "Doe"
- "Alice" → first_name: "Alice", last_name: "Alice"
- "" → first_name: "Unknown", last_name: "Unknown"

---

### **0024_add_user_constraints.sql** - Add Constraints
- Makes `first_name` NOT NULL
- Makes `last_name` NOT NULL
- Adds UNIQUE constraint on `display_id`
- Creates index on `display_id` for performance

**Status:** ✅ Safe to run after data migration

---

### **0025_create_display_id_sequence_and_trigger.sql** - Auto-generation Setup
- Creates sequence `display_id_seq` starting at 100000
- Creates function `generate_display_id()` with smart prefix detection:
  - `CUST-XXXXXX` for users with customer_profiles
  - `EMP-XXXXXX` for users with admin_profiles
  - `USER-XXXXXX` for generic users
- Creates INSERT and UPDATE triggers

**Status:** ✅ Safe to run, critical for new users

**Behavior:**
- Trigger runs BEFORE INSERT/UPDATE
- Only generates if `display_id` is NULL
- Sequential 6-digit codes (100000, 100001, etc.)

---

### **0026_drop_deprecated_user_fields.sql** - Cleanup (OPTIONAL)
⚠️ **WARNING:** Run this ONLY after thorough testing

Removes deprecated fields:
- `name` → Use first_name, middle_name, last_name
- `customer_id` → Use display_id
- `user_type` → Use profile table detection
- Drops `user_type` enum

**Status:** ⚠️ DESTRUCTIVE - Test thoroughly before running

---

### **0027_rollback_user_schema_changes.sql** - Emergency Rollback
🚨 **EMERGENCY USE ONLY**

Restores old schema if critical issues occur:
- Recreates `name`, `customer_id`, `user_type` fields
- Restores data from new fields
- Drops new fields and triggers

**Status:** 🚨 Use only in emergencies

**Recovery Strategy:**
```sql
-- Restore old schema
\i 0027_rollback_user_schema_changes.sql

-- Verify data integrity
SELECT 
  COUNT(*) as total_users,
  COUNT(name) as users_with_name,
  COUNT(customer_id) as users_with_customer_id
FROM users;
```

---

## 🚀 Execution Plan

### Development/Staging:
```bash
# 1. Run migrations 0022-0025 (core changes)
psql $DATABASE_URL -f src/database/migrations/0022_add_user_name_fields.sql
psql $DATABASE_URL -f src/database/migrations/0023_data_migration_user_names.sql
psql $DATABASE_URL -f src/database/migrations/0024_add_user_constraints.sql
psql $DATABASE_URL -f src/database/migrations/0025_create_display_id_sequence_and_trigger.sql

# 2. Test thoroughly (DO NOT run 0026 yet)
# - Test user creation
# - Test display_id generation
# - Test existing user queries
# - Verify all APIs work

# 3. After extensive testing, optionally run cleanup
psql $DATABASE_URL -f src/database/migrations/0026_drop_deprecated_user_fields.sql
```

### Production:
```bash
# 1. Backup database FIRST
pg_dump $DATABASE_URL > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# 2. Run in transaction for safety
psql $DATABASE_URL << EOF
BEGIN;
\i src/database/migrations/0022_add_user_name_fields.sql
\i src/database/migrations/0023_data_migration_user_names.sql
\i src/database/migrations/0024_add_user_constraints.sql
\i src/database/migrations/0025_create_display_id_sequence_and_trigger.sql
COMMIT;
EOF

# 3. Verify migration success
psql $DATABASE_URL -c "SELECT first_name, last_name, display_id FROM users LIMIT 10;"

# 4. Monitor application logs for errors

# 5. Keep 0026 and 0027 ready but DO NOT execute until confirmed stable
```

---

## ✅ Verification Checklist

After running migrations 0022-0025:

- [ ] All users have `first_name` and `last_name` populated
- [ ] All users have unique `display_id` values
- [ ] Display IDs follow correct format (CUST-/EMP-/USER-)
- [ ] New user creation generates display_id automatically
- [ ] All customer APIs return correct data
- [ ] All admin APIs return correct data
- [ ] Auth flows work correctly
- [ ] Profile APIs work correctly
- [ ] No database errors in application logs

---

## 🔍 Testing Queries

```sql
-- Check data migration success
SELECT 
  COUNT(*) as total,
  COUNT(first_name) as has_first_name,
  COUNT(last_name) as has_last_name,
  COUNT(display_id) as has_display_id,
  COUNT(DISTINCT display_id) as unique_display_ids
FROM users;

-- Verify display_id formats
SELECT 
  SUBSTRING(display_id, 1, 4) as prefix,
  COUNT(*) as count
FROM users
WHERE display_id IS NOT NULL
GROUP BY prefix
ORDER BY prefix;

-- Check for any NULL values (should be none after migration)
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  display_id 
FROM users 
WHERE first_name IS NULL 
   OR last_name IS NULL 
   OR display_id IS NULL
LIMIT 10;

-- Test trigger by inserting test user
BEGIN;
INSERT INTO users (email, first_name, last_name)
VALUES ('test@example.com', 'Test', 'User')
RETURNING id, display_id;
ROLLBACK;

-- Verify no duplicate display_ids
SELECT display_id, COUNT(*) 
FROM users 
GROUP BY display_id 
HAVING COUNT(*) > 1;
```

---

## ⚠️ Important Notes

1. **DO NOT run migration 0026** (drop deprecated fields) until:
   - All migrations 0022-0025 are successful
   - Application is stable in production for at least 1 week
   - All edge cases are tested
   - Rollback plan is tested

2. **Keep migration 0027** (rollback) ready but DO NOT execute unless:
   - Critical production issues occur
   - Data integrity is compromised
   - Business operations are severely impacted

3. **Deprecated fields remain** in database after migrations 0022-0025:
   - They are nullable and not used by application
   - They serve as backup during transition period
   - They can be dropped later via migration 0026

4. **Application code is already updated:**
   - All APIs use new field structure
   - All queries reference first_name, last_name, display_id
   - No code references deprecated fields

---

## 📞 Support

If migration fails or issues occur:
1. Check application logs for errors
2. Review verification queries above
3. If critical, execute rollback migration 0027
4. Restore from backup if necessary

---

## 📊 Migration Status

- **Created:** February 2, 2026
- **Code Updated:** ✅ Complete
- **Migrations Created:** ✅ Complete (0022-0027)
- **Tested:** ⏳ Pending (run on development first)
- **Staging Applied:** ⏳ Pending
- **Production Applied:** ⏳ Pending
- **Cleanup Applied:** ⏳ Pending (wait 1+ week after production)
