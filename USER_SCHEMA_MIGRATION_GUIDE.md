# User Schema Migration Guide
**Date:** December 25, 2025
**Migration:** 0005_comprehensive_user_schema.sql
**Impact:** Major schema change for ecommerce platform

---

## 📋 Overview

This migration transforms the basic user table into a comprehensive ecommerce user management system with advanced features for customer segmentation, loyalty programs, GDPR compliance, and analytics.

### Key Changes:
- ✅ Split `name` → `first_name` + `last_name`
- ✅ Added 40+ new fields for ecommerce functionality
- ✅ Comprehensive indexing strategy
- ✅ GDPR compliance features
- ✅ Security enhancements
- ✅ Data integrity constraints

---

## 🔄 Migration Steps

### Phase 1: Preparation (Pre-Deployment)
```bash
# 1. Create full database backup
pg_dump your_database > backup_pre_migration.sql

# 2. Test migration on staging environment
# Apply migration and run comprehensive tests

# 3. Update application code (see below)
```

### Phase 2: Deployment
```bash
# 1. Deploy application with updated code
# 2. Run migration during low-traffic window
npm run db:migrate

# 3. Monitor application logs and performance
# 4. Run post-migration data validation
```

### Phase 3: Post-Deployment
```bash
# 1. Update API documentation
# 2. Notify stakeholders of new features
# 3. Monitor performance metrics
# 4. Consider index maintenance if table is large
```

---

## 📝 Code Changes Required

### 1. User Registration API
**File:** `src/features/auth/apis/register.ts`
```typescript
// BEFORE
const userData = {
  name: `${firstName} ${lastName}`,
  email,
  password: hashedPassword,
  phone_number: phoneNumber,
};

// AFTER
const userData = {
  first_name: firstName,
  last_name: lastName,
  email,
  password_hash: hashedPassword,
  phone_number: phoneNumber,
  email_verified: false,
  phone_verified: false,
  account_status: 'active',
  risk_profile: 'low',
  gdpr_status: 'pending',
  subscribed_email: true,
  loyalty_enrolled: false,
  loyalty_points: 0,
  credit_balance: '0.00',
  total_orders: 0,
  total_spent: '0.00',
  average_order_value: '0.00',
  wishlist: 0,
  support_tickets: 0,
  failed_login_attempts: 0,
};
```

### 2. User Profile API
**File:** `src/features/user/apis/get-user.ts`
```typescript
// BEFORE
return {
  id: user.id,
  name: user.name,
  email: user.email,
  phone_number: user.phone_number,
};

// AFTER
return {
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  email_verified: user.email_verified,
  phone_number: user.phone_number,
  phone_verified: user.phone_verified,
  profile_img: user.profile_img,
  // ... include other public fields
};
```

### 3. Authentication Response
**File:** `src/features/auth/apis/login.ts`
```typescript
// BEFORE
return {
  id: user.id,
  name: user.name,
  email: user.email,
  token,
};

// AFTER
return {
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  email_verified: user.email_verified,
  phone_number: user.phone_number,
  phone_verified: user.phone_verified,
  account_status: user.account_status,
  token,
  expires_at: tokenExpiration,
};
```

### 4. Admin User Management
**File:** `src/features/user/apis/get-all-users.ts`
```typescript
// Add new filters
const filters = {
  account_status: req.query.account_status,
  risk_profile: req.query.risk_profile,
  customer_segment: req.query.customer_segment,
  total_spent_min: req.query.total_spent_min,
  // ... other filters
};
```

### 5. User Search Functionality
**File:** `src/features/user/services/user.service.ts`
```typescript
// BEFORE
.where(sql`LOWER(${users.name}) LIKE LOWER(${`%${search}%`})`)

// AFTER
.where(sql`LOWER(${users.first_name}) LIKE LOWER(${`%${search}%`})
   OR LOWER(${users.last_name}) LIKE LOWER(${`%${search}%`})
   OR LOWER(${users.email}) LIKE LOWER(${`%${search}%`})`)
```

---

## 🔍 Data Validation Queries

Run these queries after migration to validate data integrity:

```sql
-- Check for null first_name/last_name
SELECT COUNT(*) as null_names FROM users WHERE first_name = '' OR last_name = '';

-- Check email format
SELECT email FROM users WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- Check loyalty points
SELECT id, loyalty_points FROM users WHERE loyalty_points < 0;

-- Check credit balance
SELECT id, credit_balance FROM users WHERE credit_balance < 0;

-- Check failed login attempts
SELECT id, failed_login_attempts FROM users WHERE failed_login_attempts < 0 OR failed_login_attempts > 10;

-- Check referral ID uniqueness
SELECT referral_id, COUNT(*) as count FROM users GROUP BY referral_id HAVING COUNT(*) > 1;
```

---

## 📊 Performance Considerations

### Indexing Strategy
- **40+ indexes** added for optimal query performance
- Composite indexes for common filter combinations
- Partial indexes for frequently filtered columns

### Query Optimization Tips
```typescript
// Use indexed fields for filtering
const activeUsers = await db
  .select()
  .from(users)
  .where(and(
    eq(users.account_status, 'active'),
    eq(users.is_deleted, false)
  ));

// Avoid JSONB operations in WHERE clauses when possible
// Prefer top-level columns for frequently queried data
```

### Monitoring Queries
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'users'
ORDER BY idx_scan DESC;

-- Check table size and growth
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename = 'users';
```

---

## 🔐 Security Enhancements

### Account Protection
- **Failed login tracking** with automatic account locking
- **IP-based tracking** for security monitoring
- **Session management** with token expiration
- **Risk profiling** for fraud prevention

### GDPR Compliance
- **Consent tracking** with timestamps and versions
- **Data retention** policies
- **Right to erasure** support via soft deletes
- **Audit trails** for all user data changes

### Best Practices
```typescript
// Always check account status before authentication
if (user.account_status !== 'active') {
  throw new HttpException(403, 'Account is not active');
}

// Implement progressive delays for failed login attempts
const delay = Math.pow(2, user.failed_login_attempts) * 1000; // Exponential backoff

// Log security events
await auditService.log({
  action: 'LOGIN_FAILED',
  resource_type: 'user',
  resource_id: user.id,
  metadata: { ip: req.ip, reason: 'invalid_password' }
});
```

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] User creation with new required fields
- [ ] Profile updates with validation
- [ ] Authentication with account status checks
- [ ] Search functionality with new fields

### Integration Tests
- [ ] Registration API with all new fields
- [ ] Login with account locking logic
- [ ] Profile management APIs
- [ ] Admin user management with filters

### Performance Tests
- [ ] Query performance with new indexes
- [ ] User search with multiple filters
- [ ] Bulk operations on large datasets

---

## 🚨 Rollback Plan

If migration fails:

```sql
-- Restore from backup
psql your_database < backup_pre_migration.sql

-- Or selective rollback (if partial migration)
-- Note: Complex rollback due to data transformations
-- Consider application rollback instead
```

---

## 📈 Analytics & Reporting

### New Metrics Available
```sql
-- Customer segmentation analysis
SELECT customer_segment, COUNT(*) as count,
       AVG(total_spent) as avg_spent,
       AVG(total_orders) as avg_orders
FROM users
WHERE account_status = 'active'
GROUP BY customer_segment;

-- Loyalty program effectiveness
SELECT loyalty_enrolled,
       COUNT(*) as users,
       AVG(loyalty_points) as avg_points,
       SUM(credit_balance) as total_credit
FROM users
GROUP BY loyalty_enrolled;

-- Risk profile distribution
SELECT risk_profile, COUNT(*) as count
FROM users
GROUP BY risk_profile;
```

---

## 🔧 Maintenance Tasks

### Post-Migration
```sql
-- Update table statistics
ANALYZE users;

-- Reindex if needed (for large tables)
REINDEX TABLE users;

-- Vacuum for cleanup
VACUUM ANALYZE users;
```

### Ongoing Maintenance
```sql
-- Monthly: Clean up expired sessions
UPDATE users SET token = NULL, expires_at = NULL
WHERE expires_at < NOW();

-- Weekly: Reset failed login attempts for old records
UPDATE users SET failed_login_attempts = 0, locked_until = NULL
WHERE locked_until < NOW() - INTERVAL '30 days';

-- Daily: Update user statistics (if using triggers)
-- Consider implementing database triggers for automatic stat updates
```

---

## 📚 Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs)
- [PostgreSQL Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [Ecommerce Database Design Patterns](https://database-patterns.com/)

---

## ✅ Success Criteria

- [ ] Migration completes without errors
- [ ] All existing functionality works
- [ ] New features are accessible
- [ ] Performance meets requirements (< 100ms for user queries)
- [ ] Data integrity is maintained
- [ ] Security features are functional
- [ ] GDPR compliance is verified

---

**Migration Guide Complete** ✅

*Remember: Test thoroughly in staging before production deployment!*"