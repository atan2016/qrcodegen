# Quick Debugging Guide (Without New Code)

Since the debug endpoint isn't deployed yet, here's how to check your session configuration:

## Method 1: Check Vercel Function Logs

1. Go to **Vercel Dashboard** → Your Project → **Logs**
2. Look for these messages when the function starts:

   **Good signs:**
   - ✅ `"Session store initialized successfully"`
   - ✅ `"Using PostgreSQL session store for persistence"`
   - ✅ `"PostgreSQL connection successful"`

   **Bad signs:**
   - ❌ `"Using memory store - sessions may not persist across serverless invocations"`
   - ❌ `"DATABASE_URL may not be set or session store creation failed"`
   - ❌ `"PostgreSQL connection test failed"`

3. When you try to log in, look for:
   - ✅ `"User authenticated successfully: [email]"`
   - ✅ `"Session saved successfully"`
   - ❌ Any errors about session saving

## Method 2: Test Existing Endpoint

Try this endpoint (it should already exist):
```
https://qrcodegen.creators-lab.org/api/auth/me
```

**If you see:** `{"user":null}` → Session isn't working
**If you see:** User data → Session might be working

## Method 3: Check Browser Console

1. Open your site
2. Open Browser DevTools (F12) → **Console** tab
3. Try logging in
4. Look for:
   - Redirect loop messages
   - Network errors
   - Cookie-related errors

## Method 4: Check Cookies

1. Open DevTools (F12) → **Application** tab → **Cookies**
2. Click on your domain
3. After logging in, you should see:
   - Cookie named `connect.sid`
   - Has `HttpOnly` checked
   - Has `Secure` checked
   - `SameSite` is `Lax`

If you don't see this cookie, sessions aren't being set.

## What to Do Next

### If you see "Using memory store" in logs:
- DATABASE_URL might not be set correctly
- Or DATABASE_URL format is wrong
- **Action:** Double-check DATABASE_URL in Vercel settings

### If you see "PostgreSQL connection failed":
- DATABASE_URL connection string might be incorrect
- Database might not be accessible
- **Action:** Verify DATABASE_URL format in Supabase

### If you see no cookie after login:
- Cookie settings might be wrong
- Browser might be blocking cookies
- **Action:** Check cookie settings and browser privacy settings

### If you see session saved but still get logged out:
- Session table might not exist in database
- Session store might not be working
- **Action:** Check Supabase for `session` table

## Deploy the Debug Endpoint

To get the `/api/auth/debug` endpoint, you need to deploy:

1. **Option A: Redeploy**
   - Go to Vercel Dashboard → Deployments
   - Click "Redeploy" on latest deployment

2. **Option B: Push a commit**
   - Make any small change (add a comment in code)
   - Commit and push
   - This triggers a new deployment

## Report Back

Please share:
1. What you see in **Vercel Logs** (especially session store messages)
2. What happens when you visit `/api/auth/me`
3. Whether you see the `connect.sid` cookie after login
4. Any errors in browser console

This will help diagnose the issue without needing the debug endpoint.

