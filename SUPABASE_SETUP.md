# Supabase Setup Guide

This guide will help you set up Supabase for the QR Code Generator application.

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com/)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: QR Code Generator (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (takes a few minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (this is your `SUPABASE_URL`)
   - **anon/public key** (this is your `SUPABASE_ANON_KEY`)

3. **For Session Storage (Recommended for Production):**
   - Go to **Settings** → **Database**
   - Under **Connection string**, select **URI**
   - Copy the connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
   - This is your `DATABASE_URL` (or `SUPABASE_DB_URL`)
   - **Note:** Replace `[YOUR-PASSWORD]` with your actual database password

## Step 3: Create Database Tables

Go to **SQL Editor** in your Supabase dashboard and run the following SQL:

### Users Table

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

### QR Codes Table

```sql
CREATE TABLE IF NOT EXISTS qrcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  qr_code_data_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_manually_expired BOOLEAN DEFAULT FALSE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_qrcodes_user_id ON qrcodes(user_id);
CREATE INDEX IF NOT EXISTS idx_qrcodes_created_at ON qrcodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qrcodes_expires_at ON qrcodes(expires_at);
```

### Row Level Security (RLS) Policies

Enable RLS and create policies to ensure users can only access their own data:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Enable RLS on qrcodes table
ALTER TABLE qrcodes ENABLE ROW LEVEL SECURITY;

-- Users can read their own QR codes
CREATE POLICY "Users can read own qrcodes" ON qrcodes
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can insert their own QR codes
CREATE POLICY "Users can insert own qrcodes" ON qrcodes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own QR codes
CREATE POLICY "Users can update own qrcodes" ON qrcodes
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own QR codes
CREATE POLICY "Users can delete own qrcodes" ON qrcodes
  FOR DELETE USING (auth.uid()::text = user_id::text);
```

**Note**: Since we're using OAuth (not Supabase Auth), the RLS policies above won't work as-is. For now, we'll handle security in the application layer. You can either:

1. **Disable RLS** (simpler for OAuth):
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE qrcodes DISABLE ROW LEVEL SECURITY;
```

2. **Or keep RLS disabled** and rely on application-level security (which we've implemented)

## Step 4: Set Environment Variables

### For Local Development

Add to your `.env` file:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
DATABASE_URL=postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres
```

**Note:** The `DATABASE_URL` is optional but recommended for production. It enables PostgreSQL-backed session storage instead of memory store.

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `SUPABASE_URL` = Your Supabase project URL
   - `SUPABASE_ANON_KEY` = Your Supabase anon key

## Step 5: Test the Connection

After setting up, restart your server and test:

1. Start the server: `npm start`
2. Try creating a QR code
3. Check your Supabase dashboard → **Table Editor** to see if data appears

## Troubleshooting

### "relation does not exist" error
- Make sure you've run the SQL commands to create the tables
- Check that you're connected to the correct Supabase project

### "permission denied" error
- Check your `SUPABASE_ANON_KEY` is correct
- Verify RLS policies if enabled
- For OAuth apps, consider disabling RLS and using application-level security

### Data not appearing
- Check the Supabase dashboard → **Table Editor**
- Verify your environment variables are set correctly
- Check server logs for errors

## Next Steps

Once Supabase is set up:
1. Deploy to Vercel
2. Set environment variables in Vercel
3. Update Google OAuth callback URL to your production domain
4. Test the deployment

