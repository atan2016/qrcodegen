# Debugging Session Persistence Issues

## Current Status

✅ **DATABASE_URL is set** in Vercel environment variables

## Issue: Infinite Redirect Loop

The error you're seeing (`chunk-CARILTDN.js` with repeating function calls) indicates an infinite redirect loop between the login page and home page.

## Steps to Fix

### 1. Redeploy After Adding DATABASE_URL

**IMPORTANT:** After adding `DATABASE_URL` to Vercel, you MUST redeploy for the changes to take effect.

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click "Redeploy" on the latest deployment, OR
3. Push a new commit to trigger a new deployment

Environment variables are only loaded when the function starts, so existing deployments won't have the new variable.

### 2. Check Session Configuration

After redeploying, visit this diagnostic endpoint:
```
https://qrcodegen.creators-lab.org/api/auth/debug
```

This will show you:
- Whether session store is using PostgreSQL or Memory
- Whether DATABASE_URL is detected
- Whether SESSION_SECRET is set
- Cookie security settings
- Current session status

**Expected output** (if everything is configured correctly):
```json
{
  "hasSessionStore": true,
  "sessionStoreType": "PostgreSQL",
  "hasDatabaseUrl": true,
  "hasSessionSecret": true,
  "isSecureCookie": true,
  ...
}
```

**If you see:**
- `"sessionStoreType": "Memory"` → DATABASE_URL might not be set correctly or session store creation failed
- `"hasDatabaseUrl": false` → DATABASE_URL environment variable not found

### 3. Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Look for messages like:
   - ✅ `"Using PostgreSQL session store for persistence"` → Good!
   - ❌ `"Using memory store"` → Problem!
   - ❌ `"DATABASE_URL may not be set"` → Problem!

3. After logging in, check for:
   - ✅ `"User authenticated successfully: [email]"`
   - ✅ `"Session saved successfully"`
   - ❌ Any error messages about session saving

### 4. Clear Browser Data

1. Open browser DevTools (F12)
2. Go to Application → Cookies
3. Delete all cookies for your domain
4. Go to Application → Local Storage / Session Storage
5. Clear all data for your domain
6. Try logging in again

### 5. Check Browser Console

After clearing cookies and trying to log in, check the browser console for:
- Any CORS errors
- Cookie-related errors
- Network errors when calling `/api/auth/me`

### 6. Verify Cookie is Set

After logging in:
1. Open DevTools → Application → Cookies
2. Look for a cookie named `connect.sid`
3. Check:
   - **Domain**: Should be your domain (`.creators-lab.org` or exact domain)
   - **Path**: Should be `/`
   - **HttpOnly**: Should be checked
   - **Secure**: Should be checked (if on HTTPS)
   - **SameSite**: Should be `Lax`

If the cookie isn't there or looks wrong, that's the problem.

## Common Issues

### Issue 1: Session Store Not Created

**Symptoms:**
- Diagnostic endpoint shows `"sessionStoreType": "Memory"`
- Logs show "Using memory store"

**Solutions:**
1. Verify DATABASE_URL format is correct:
   - Should start with `postgresql://`
   - Should include password (URL-encoded if special characters)
   - Should point to correct Supabase database

2. Check DATABASE_URL has no extra spaces or quotes

3. Verify DATABASE_URL is set for all environments (Production, Preview, Development)

### Issue 2: Cookie Not Being Set

**Symptoms:**
- Login succeeds but redirect loop continues
- No `connect.sid` cookie in browser

**Solutions:**
1. Check that `SESSION_SECRET` is set in Vercel
2. Verify cookie settings match your domain (secure flag, sameSite)
3. Check browser isn't blocking third-party cookies

### Issue 3: Session Not Persisting

**Symptoms:**
- Cookie is set but user is logged out on next request
- Session works for a moment then fails

**Solutions:**
1. Verify session table exists in Supabase database
2. Check Vercel logs for session store errors
3. Verify DATABASE_URL connection is working

## Testing Checklist

- [ ] DATABASE_URL is set in Vercel
- [ ] Project has been redeployed after adding DATABASE_URL
- [ ] Diagnostic endpoint shows PostgreSQL session store
- [ ] Vercel logs show "Using PostgreSQL session store"
- [ ] Browser cookies show `connect.sid` cookie after login
- [ ] Cookie has correct attributes (HttpOnly, Secure, SameSite)
- [ ] No redirect loop (page stays on home after login)
- [ ] User remains logged in after page refresh

## Next Steps

1. **Redeploy** your project (critical!)
2. Visit `/api/auth/debug` to check configuration
3. Check Vercel logs for session store messages
4. Try logging in with browser DevTools open
5. Check cookies after login
6. Report back what you see in the diagnostic endpoint and logs

## Contact

If after following these steps you still have issues, provide:
1. Output from `/api/auth/debug` endpoint
2. Relevant lines from Vercel function logs
3. Screenshot of cookies in browser DevTools
4. Any error messages from browser console

