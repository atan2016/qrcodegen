# Session Persistence Fix

## Changes Made

This document outlines the fixes applied to resolve the login persistence issue.

### 1. Improved Session Store Initialization (`lib/sessionStore.js`)

- Added validation for DATABASE_URL format
- Improved error handling and logging
- Added session table existence check
- Increased connection timeout for serverless environments
- Better error messages when DATABASE_URL is missing

### 2. Enhanced Session Configuration (`server.js`)

- Added `proxy: true` to trust Vercel's proxy (critical for cookies)
- Added validation warnings for missing SESSION_SECRET
- Improved cookie configuration for Vercel serverless
- Better logging in OAuth callback

### 3. Improved OAuth Callback (`server.js`)

- Explicitly mark session as modified
- Store user info in session for verification
- Enhanced error logging
- Use 302 redirect to ensure cookie is sent

### 4. Enhanced Debugging (`server.js`)

- Improved `/api/auth/debug` endpoint with more details
- Better logging in `/api/auth/me` endpoint
- Session validation checks

### 5. Session Table Creation Script

- Created `create_session_table.sql` as fallback
- Usually created automatically, but can be run manually if needed

## Critical Requirements

### Environment Variables (Must be set in Vercel)

1. **DATABASE_URL** (Required)
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - Get from: Supabase Dashboard → Settings → Database → Connection string
   - **CRITICAL**: Without this, sessions use memory store and won't persist!

2. **SESSION_SECRET** (Required)
   - A random string (at least 32 characters recommended)
   - Generate with: `openssl rand -base64 32`
   - **CRITICAL**: Must be set in production!

3. **GOOGLE_CLIENT_ID** (Required)
   - From Google Cloud Console

4. **GOOGLE_CLIENT_SECRET** (Required)
   - From Google Cloud Console

5. **GOOGLE_CALLBACK_URL** (Optional)
   - Defaults to `https://your-domain.vercel.app/auth/google/callback`
   - Set if using custom domain

## Testing Steps

### 1. Verify Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all required variables are set
3. **IMPORTANT**: Redeploy after adding/changing environment variables!

### 2. Check Session Store

Visit: `https://your-domain.vercel.app/api/auth/debug`

Expected output:
```json
{
  "hasSessionStore": true,
  "sessionStoreType": "PostgreSQL",
  "hasDatabaseUrl": true,
  "databaseUrlFormat": "Valid",
  "hasSessionSecret": true,
  "sessionSecretLength": 32,
  "isSecureCookie": true,
  "cookieSameSite": "lax",
  "cookieHttpOnly": true,
  ...
}
```

**If you see:**
- `"sessionStoreType": "Memory"` → DATABASE_URL not set or invalid
- `"hasDatabaseUrl": false` → DATABASE_URL environment variable missing
- `"hasSessionSecret": false` → SESSION_SECRET not set

### 3. Test Login Flow

1. **Clear browser data:**
   - Open DevTools (F12)
   - Application → Cookies → Delete all
   - Application → Local Storage → Clear
   - Application → Session Storage → Clear

2. **Log in:**
   - Go to `/login.html`
   - Click "Sign in with Google"
   - Complete OAuth flow

3. **Verify session cookie:**
   - After redirect, check DevTools → Application → Cookies
   - Look for `connect.sid` cookie
   - Verify:
     - **HttpOnly**: ✓ (checked)
     - **Secure**: ✓ (checked, if on HTTPS)
     - **SameSite**: `Lax`
     - **Path**: `/`
     - **Expires**: Future date

4. **Test persistence:**
   - Refresh the page
   - You should remain logged in
   - Check browser console for any errors

### 4. Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Look for:
   - ✅ `"Using PostgreSQL session store"`
   - ✅ `"PostgreSQL connection successful"`
   - ✅ `"Session table exists"`
   - ✅ `"User authenticated: [email]"`
   - ✅ `"Session saved successfully"`

**If you see:**
- ❌ `"Using memory store"` → DATABASE_URL issue
- ❌ `"PostgreSQL connection test failed"` → Database connection issue
- ❌ `"Error saving session"` → Session store issue

## Common Issues and Solutions

### Issue 1: Session Store is Memory

**Symptoms:**
- Debug endpoint shows `"sessionStoreType": "Memory"`
- Logs show "Using memory store"

**Solutions:**
1. Verify DATABASE_URL is set in Vercel
2. Check DATABASE_URL format is correct (starts with `postgresql://`)
3. Ensure DATABASE_URL has no extra spaces or quotes
4. **Redeploy** after setting DATABASE_URL
5. Check Vercel logs for connection errors

### Issue 2: Cookie Not Being Set

**Symptoms:**
- Login succeeds but no `connect.sid` cookie in browser
- Redirect loop continues

**Solutions:**
1. Verify SESSION_SECRET is set
2. Check cookie settings in debug endpoint
3. Ensure you're on HTTPS (Vercel provides this)
4. Check browser isn't blocking cookies
5. Try in incognito/private mode
6. Check browser console for cookie-related errors

### Issue 3: Session Not Persisting

**Symptoms:**
- Cookie is set but user logged out on next request
- Session works briefly then fails

**Solutions:**
1. Verify session table exists in database
2. Check Vercel logs for session store errors
3. Verify DATABASE_URL connection is working
4. Check if session table has proper permissions
5. Run `create_session_table.sql` manually if needed

### Issue 4: Infinite Redirect Loop

**Symptoms:**
- Page keeps redirecting between login and home
- Browser console shows redirect errors

**Solutions:**
1. Clear all browser data (cookies, storage)
2. Check that DATABASE_URL is set and valid
3. Verify session store is PostgreSQL (not Memory)
4. Check browser console for errors
5. Verify SESSION_SECRET is set
6. Check CORS configuration

## Manual Session Table Creation

If the session table wasn't created automatically:

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `create_session_table.sql`
3. Verify table exists: `SELECT * FROM session LIMIT 1;`

## Additional Debugging

### Check Session in Database

```sql
-- View all sessions
SELECT sid, expire, sess FROM session ORDER BY expire DESC LIMIT 10;

-- Check session count
SELECT COUNT(*) FROM session;

-- Clean up expired sessions (optional)
DELETE FROM session WHERE expire < NOW();
```

### Browser Console Debugging

After logging in, run in browser console:
```javascript
// Check if cookie is set
document.cookie

// Check auth status
fetch('/api/auth/me', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)

// Check debug info
fetch('/api/auth/debug', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
```

## Next Steps

If login still doesn't persist after these fixes:

1. **Check Vercel Logs** for specific error messages
2. **Run Debug Endpoint** (`/api/auth/debug`) and share output
3. **Check Browser Console** for any errors
4. **Verify Environment Variables** are set correctly
5. **Ensure Redeployment** after setting environment variables

## Files Modified

- `lib/sessionStore.js` - Improved session store initialization
- `server.js` - Enhanced session config and OAuth callback
- `create_session_table.sql` - Manual session table creation script (new)

## Related Documentation

- `DEBUG_SESSION_ISSUES.md` - Previous debugging guide
- `SESSION_FIX_SUMMARY.md` - Previous fix summary
- `VERCEL_DEPLOY_STEPS.md` - Deployment instructions

