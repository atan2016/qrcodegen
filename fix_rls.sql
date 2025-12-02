-- Fix RLS for OAuth-based authentication
-- Since we're using OAuth (not Supabase Auth), RLS policies won't work
-- We handle security in the application layer instead

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Disable RLS on qrcodes table  
ALTER TABLE qrcodes DISABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies if they exist (optional, but cleans up)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own qrcodes" ON qrcodes;
DROP POLICY IF EXISTS "Users can insert own qrcodes" ON qrcodes;
DROP POLICY IF EXISTS "Users can update own qrcodes" ON qrcodes;
DROP POLICY IF EXISTS "Users can delete own qrcodes" ON qrcodes;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'qrcodes');

