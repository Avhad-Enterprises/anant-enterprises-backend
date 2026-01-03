# Supabase Auth Setup Guide

This guide explains how to complete your Supabase authentication setup after the recent improvements.

## 🚀 What Was Fixed

### 1. Environment Configuration ✅
- **`.env.example`**: Sanitized and added all Supabase configuration variables
- **Security**: Removed all real credentials from example file

### 2. Email Confirmations ✅
- **`supabase/config.toml`**: Enabled `enable_confirmations = true`
- **Impact**: Users must verify email before signing in (production-ready)

### 3. Automatic Token Refresh ✅
- **`AuthContext.tsx`**: Added automatic refresh 5 minutes before token expiry
- **Impact**: Users won't be logged out unexpectedly during active sessions

### 4. Database Trigger for User Sync ✅
- **Created**: `supabase/migrations/create_auth_sync_trigger.sql`
- **Purpose**: Automatically creates `public.users` record when user signs up via Supabase Auth

## 📝 Required Actions

### Step 1: Apply the Database Trigger (IMPORTANT!)

The database trigger ensures that when users sign up via Supabase Auth, they're automatically added to your `public.users` table.

#### For Local Development:

```bash
# Option 1: Using Supabase Studio (Recommended)
# 1. Make sure Supabase is running
supabase start

# 2. Open Supabase Studio
open http://127.0.0.1:54323

# 3. Go to SQL Editor
# 4. Copy the contents of supabase/migrations/create_auth_sync_trigger.sql
# 5. Paste and run it
```

```bash
# Option 2: Using psql command line
# 1. Connect to your local Supabase database
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# 2. Run the migration file
\i supabase/migrations/create_auth_sync_trigger.sql

# 3. Verify it was created
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

# 4. Exit
\q
```

#### For Production:

```bash
# Option 1: Using Supabase Dashboard
# 1. Go to https://app.supabase.com
# 2. Select your project
# 3. Go to SQL Editor
# 4. Copy contents of supabase/migrations/create_auth_sync_trigger.sql
# 5. Run it

# Option 2: Using Supabase CLI (if you have production connected)
supabase db push
```

### Step 2: Test the User Sync

After applying the trigger, test it:

```bash
# 1. Sign up a new user via your frontend
# URL: http://localhost:3000/register

# 2. Check if they appear in public.users
# Open Supabase Studio: http://127.0.0.1:54323
# Go to Table Editor -> users
# Look for the new user

# Or use SQL:
# SELECT * FROM public.users WHERE email = 'testuser@example.com';
```

### Step 3: Restart Supabase (to apply config changes)

The email confirmation setting requires a Supabase restart:

```bash
# Stop current instance
supabase stop

# Start fresh with new config
supabase start
```

## 🔍 Verification Checklist

After completing the steps above, verify everything works:

- [ ] Database trigger exists
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```

- [ ] New user sign-ups create records in `public.users`
  ```sql
  SELECT id, auth_id, email, name FROM public.users ORDER BY created_at DESC LIMIT 5;
  ```

- [ ] Email confirmation is enabled (check Supabase Studio -> Authentication -> Settings)

- [ ] Tokens refresh automatically (watch browser console during a long session)

## ⚙️ Environment Variables

Make sure your actual `.env` file has these variables set:

### Backend `.env` (Local Development)
```bash
# Get these from: supabase start
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# Alternative format (older)
ANON_KEY=eyJhbGciOi...
SERVICE_ROLE_KEY=eyJhbGciOi...
```

### Frontend `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

To get these values:
```bash
supabase start
# Look for the "Authentication Keys" section in the output
```

## 🔐 What About RLS Policies?

RLS (Row Level Security) policies were skipped for now as they can be implemented later. When you're ready:

```sql
-- Example RLS policy for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own data"
ON public.users FOR UPDATE
USING (auth.uid() = auth_id);
```

## 🐛 Troubleshooting

### Issue: "relation auth.users does not exist"
**Solution**: You're trying to run the trigger on a non-Supabase database. Make sure you're connected to your Supabase instance.

### Issue: New users not appearing in public.users
**Solution**: 
1. Check if trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. Check trigger function: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`
3. Look for errors in Supabase logs

### Issue: Email confirmation not working
**Solution**:
1. Restart Supabase: `supabase stop && supabase start`
2. Check config: `cat supabase/config.toml | grep enable_confirmations`
3. For local testing, check emails at: http://127.0.0.1:54324

### Issue: Tokens not refreshing
**Solution**:
1. Open browser DevTools -> Console
2. Sign in and wait (tokens expire in 1 hour by default)
3. You should see automatic refresh ~5 minutes before expiry
4. If not, check for JavaScript errors

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Database Triggers Guide](https://supabase.com/docs/guides/database/postgres/triggers)
- [RLS Policies Tutorial](https://supabase.com/docs/guides/auth/row-level-security)

## 🎯 Next Steps (Future Enhancements)

Consider implementing these later:
- [ ] OAuth providers (Google, GitHub)
- [ ] Password reset API endpoints
- [ ] MFA (Multi-Factor Authentication)
- [ ] Session management UI
- [ ] Auth audit logging
- [ ] RLS policies for all tables
