# Fixing 500 Internal Server Error on Login

You're getting a **500 Internal Server Error** on `/auth/google/callback`. This means something is crashing during the OAuth callback.

## Step 1: Check Vercel Logs (Most Important!)

The logs will tell us exactly what's failing:

1. Go to **Vercel Dashboard** → Your Project → **Logs**
2. Look at the logs around the time you tried to login
3. **Look for error messages** - they'll tell us what's wrong

Common errors you might see:

### Error 1: "relation 'users' does not exist"
- **Problem:** Users table doesn't exist in Supabase
- **Fix:** Run the SQL script to create the users table (see below)

### Error 2: "Error creating user in Supabase" or "Error finding user"
- **Problem:** Database connection or permissions issue
- **Fix:** Check SUPABASE_URL and SUPABASE_ANON_KEY are correct

### Error 3: "Supabase credentials not found"
- **Problem:** Missing SUPABASE_URL or SUPABASE_ANON_KEY
- **Fix:** Add them to Vercel environment variables

### Error 4: "Error in Google OAuth strategy"
- **Problem:** Something failing during user lookup/creation
- **Fix:** Check the specific error details in logs

## Step 2: Verify Supabase Tables Exist

The most common cause is missing database tables:

1. Go to **Supabase Dashboard** → Your Project → **Table Editor**
2. Check if you have:
   - ✅ `users` table
   - ✅ `qrcodes` table

If these tables don't exist, you need to create them:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this SQL to create the `users` table:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
```

3. Run this SQL to create the `qrcodes` table:

```sql
CREATE TABLE IF NOT EXISTS qrcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  qr_code_data_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_manually_expired BOOLEAN DEFAULT FALSE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_qrcodes_user_id ON qrcodes(user_id);
CREATE INDEX IF NOT EXISTS idx_qrcodes_id ON qrcodes(id);
```

4. Disable RLS (Row Level Security) if needed:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE qrcodes DISABLE ROW LEVEL SECURITY;
```

## Step 3: Verify Environment Variables

Check that these are set in **Vercel** → **Settings** → **Environment Variables**:

- ✅ `SUPABASE_URL` - Your Supabase project URL
- ✅ `SUPABASE_ANON_KEY` - Your Supabase anon key
- ✅ `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- ✅ `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
- ✅ `GOOGLE_CALLBACK_URL` - Should be `https://qrcodegen.creators-lab.org/auth/google/callback`
- ✅ `SESSION_SECRET` - Random secret string
- ✅ `DATABASE_URL` - Supabase database connection string (for sessions)

**After adding/changing environment variables, you MUST redeploy!**

## Step 4: Redeploy After Fixes

After creating tables or adding environment variables:

1. Go to **Vercel Dashboard** → **Deployments**
2. Click **three dots (⋯)** → **Redeploy**
3. Wait for deployment to complete
4. Try logging in again

## Step 5: Check Logs Again

After redeploying and trying to login:

1. Check **Vercel Logs** again
2. Look for the actual error message
3. The improved error handling will show detailed errors

## Quick Checklist

- [ ] Checked Vercel logs for the exact error
- [ ] Verified `users` table exists in Supabase
- [ ] Verified `qrcodes` table exists in Supabase
- [ ] Verified all environment variables are set in Vercel
- [ ] Redeployed after making changes
- [ ] Checked logs again after redeploy

## What to Report Back

Please share:
1. **What error message you see in Vercel logs** (this is the most important!)
2. Whether the tables exist in Supabase
3. Which environment variables you have set

This will help identify the exact issue!

