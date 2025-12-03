# Step-by-Step Vercel Deployment Guide
## Deploying to qrcodegen.creators-lab.org

### Prerequisites Checklist
- [x] Supabase project created and tables set up
- [x] Google OAuth credentials ready
- [x] Code pushed to GitHub (https://github.com/atan2016/qrcodegen)
- [ ] Vercel account (free tier works)

---

## Step 1: Install Vercel CLI

Open your terminal and run:

```bash
npm install -g vercel
```

**Verify installation:**
```bash
vercel --version
```

You should see a version number (e.g., `32.x.x`).

---

## Step 2: Login to Vercel

```bash
vercel login
```

This will:
1. Open your browser
2. Ask you to authorize Vercel CLI
3. You can login with GitHub (recommended since your code is on GitHub)

**Alternative:** If browser doesn't open, use:
```bash
vercel login --github
```

---

## Step 3: Navigate to Your Project

Make sure you're in the project directory:

```bash
cd /Users/ashleytan/QR_Code_Generator
```

---

## Step 4: Deploy to Vercel

Run:

```bash
vercel
```

**You'll be prompted with questions:**

1. **Set up and deploy "~/QR_Code_Generator"?** 
   - Type: `Y` and press Enter

2. **Which scope do you want to deploy to?**
   - Select your account (usually just one option)
   - Press Enter

3. **Link to existing project?**
   - Type: `N` (first time deployment)
   - Press Enter

4. **What's your project's name?**
   - Type: `qrcodegen` (or press Enter for default)
   - Press Enter

5. **In which directory is your code located?**
   - Type: `./` (current directory)
   - Press Enter

6. **Want to override the settings?**
   - Type: `N`
   - Press Enter

**Vercel will now:**
- Build your project
- Deploy it
- Give you a preview URL (e.g., `qrcodegen-xxx.vercel.app`)

**Note:** This first deployment is to a preview URL. We'll set up the custom domain next.

---

## Step 5: Set Environment Variables

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project (`qrcodegen`)
3. Go to **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)

5. Add each variable one by one:

   **Variable 1: SESSION_SECRET**
   - **Key:** `SESSION_SECRET`
   - **Value:** Generate a random string:
     ```bash
     openssl rand -base64 32
     ```
     Copy the output and paste as the value
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

   **Variable 2: GOOGLE_CLIENT_ID**
   - **Key:** `GOOGLE_CLIENT_ID`
   - **Value:** Your Google Client ID (from Google Cloud Console)
   - **Environment:** Select all
   - Click **Save**

   **Variable 3: GOOGLE_CLIENT_SECRET**
   - **Key:** `GOOGLE_CLIENT_SECRET`
   - **Value:** Your Google Client Secret (from Google Cloud Console)
   - **Environment:** Select all
   - Click **Save**

   **Variable 4: SUPABASE_URL**
   - **Key:** `SUPABASE_URL`
   - **Value:** Your Supabase URL (from your `.env` file)
   - **Environment:** Select all
   - Click **Save**

   **Variable 5: SUPABASE_ANON_KEY**
   - **Key:** `SUPABASE_ANON_KEY`
   - **Value:** Your Supabase anon key (from your `.env` file)
   - **Environment:** Select all
   - Click **Save**

   **Variable 6: DATABASE_URL** ⚠️ **CRITICAL for session persistence**
   - **Key:** `DATABASE_URL`
   - **Value:** Your Supabase database connection string (from Supabase Settings → Database → Connection string)
     - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - **Environment:** Select all
   - Click **Save**
   - **Note:** Without this, sessions will not persist on Vercel serverless functions and login will not work correctly.

   **Variable 7: NODE_ENV**
   - **Key:** `NODE_ENV`
   - **Value:** `production`
   - **Environment:** Select all
   - Click **Save**

   **Variable 8: GOOGLE_CALLBACK_URL**
   - **Key:** `GOOGLE_CALLBACK_URL`
   - **Value:** `https://qrcodegen.creators-lab.org/auth/google/callback`
   - **Environment:** Select all
   - Click **Save**

### Option B: Via CLI (Alternative)

```bash
vercel env add SESSION_SECRET
# Paste your value when prompted
# Select: Production, Preview, Development

vercel env add GOOGLE_CLIENT_ID
# Paste your Google Client ID from Google Cloud Console

vercel env add GOOGLE_CLIENT_SECRET
# Paste your Google Client Secret from Google Cloud Console

vercel env add SUPABASE_URL
# Paste your Supabase URL

vercel env add SUPABASE_ANON_KEY
# Paste your Supabase anon key

vercel env add DATABASE_URL
# Paste your Supabase database connection string (CRITICAL for session persistence)
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

vercel env add NODE_ENV production

vercel env add GOOGLE_CALLBACK_URL
# Paste: https://qrcodegen.creators-lab.org/auth/google/callback
```

---

## Step 6: Configure Custom Domain

### In Vercel Dashboard:

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Settings** → **Domains** (left sidebar)
3. In the "Domain" input field, type: `qrcodegen.creators-lab.org`
4. Click **Add**

### Configure DNS Records:

Vercel will show you DNS configuration options. You have two choices:

**Option A: CNAME (Recommended - Easier)**
- **Type:** CNAME
- **Name:** `qrcodegen`
- **Value:** `cname.vercel-dns.com.` (or what Vercel shows)
- **TTL:** 3600 (or default)

**Option B: A Records**
- Vercel will provide IP addresses to point to

### In Your DNS Provider (creators-lab.org):

1. Log in to your DNS provider (where you manage creators-lab.org)
2. Go to DNS settings
3. Add the record Vercel provided:
   - **Type:** CNAME (or A records if that's what Vercel shows)
   - **Name/Host:** `qrcodegen`
   - **Value/Target:** What Vercel provided
   - **TTL:** 3600
4. **Save** the DNS record

### Wait for DNS Propagation:

- DNS changes can take a few minutes to 48 hours
- Vercel will show the domain status in the dashboard
- When it shows "Valid Configuration", you're ready!

**Check DNS propagation:**
```bash
dig qrcodegen.creators-lab.org
# or
nslookup qrcodegen.creators-lab.org
```

---

## Step 7: Update Google OAuth Callback URL

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, you should see:
   - `http://localhost:3000/auth/google/callback` (for local dev)
5. Click **+ ADD URI**
6. Add: `https://qrcodegen.creators-lab.org/auth/google/callback`
7. Click **SAVE**

**Important:** Wait 1-2 minutes for Google's changes to propagate.

---

## Step 8: Redeploy to Production

After setting environment variables and domain:

```bash
vercel --prod
```

Or trigger a redeploy from Vercel dashboard:
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Select **Use existing Build Cache** (optional)
5. Click **Redeploy**

---

## Step 9: Verify Deployment

1. **Visit your site:**
   - Go to: `https://qrcodegen.creators-lab.org`
   - You should see the login page

2. **Test login:**
   - Click "Sign in with Google"
   - Complete OAuth flow
   - You should be redirected back and logged in

3. **Test QR code generation:**
   - Enter a URL
   - Add a description (optional)
   - Set expiration (optional)
   - Click "Generate QR Code"
   - Verify it appears

4. **Check Supabase:**
   - Go to your Supabase dashboard
   - Check **Table Editor** → `users` table (should see your user)
   - Check **Table Editor** → `qrcodes` table (should see your QR code)

---

## Troubleshooting

### Domain not working?
- Check DNS records are correct
- Wait longer for propagation (can take up to 48 hours)
- Verify domain is added in Vercel dashboard
- Check SSL certificate is issued (Vercel does this automatically)

### "redirect_uri_mismatch" error?
- Verify Google OAuth callback URL matches exactly
- Make sure you're using `https://` (not `http://`)
- Wait a few minutes after updating Google settings

### Environment variables not working?
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### Can't connect to Supabase?
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check Supabase project is active
- Verify tables exist in Supabase

### Sessions not persisting?
- This is expected with memory-based sessions on serverless
- Consider implementing database-backed sessions later
- For now, users may need to re-login occasionally

---

## Success Checklist

- [ ] Vercel CLI installed and logged in
- [ ] Project deployed to Vercel
- [ ] All environment variables set
- [ ] Custom domain configured
- [ ] DNS records added
- [ ] Google OAuth callback URL updated
- [ ] Production deployment successful
- [ ] Site accessible at qrcodegen.creators-lab.org
- [ ] Login works
- [ ] QR code generation works
- [ ] Data appears in Supabase

---

## Next Steps (Optional)

1. **Set up Vercel Analytics** (in project settings)
2. **Enable automatic deployments** from GitHub (already done if connected)
3. **Set up error monitoring** (e.g., Sentry)
4. **Implement database-backed sessions** for better reliability
5. **Set up Vercel Cron Jobs** for cleanup tasks

---

## Quick Reference Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployments
vercel ls

# View logs
vercel logs

# Remove deployment
vercel remove
```

---

**Your site will be live at:** https://qrcodegen.creators-lab.org

Good luck with your deployment! 🚀

