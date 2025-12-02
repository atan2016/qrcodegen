# Deployment Guide for Vercel

This guide will walk you through deploying the QR Code Generator to Vercel at `qrcode.creators-lab.org`.

## Prerequisites

1. ✅ Supabase project created and configured (see `SUPABASE_SETUP.md`)
2. ✅ Google OAuth credentials set up
3. ✅ Vercel account (sign up at [vercel.com](https://vercel.com))

## Step 1: Set Up Supabase

Follow the instructions in `SUPABASE_SETUP.md` to:
- Create a Supabase project
- Create the database tables
- Get your Supabase credentials

## Step 2: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 3: Login to Vercel

```bash
vercel login
```

## Step 4: Deploy to Vercel

From your project directory:

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No (first time)
- **Project name?** → `qr-code-generator` (or your choice)
- **Directory?** → `./`
- **Override settings?** → No

This will deploy to a preview URL (e.g., `qr-code-generator-xxx.vercel.app`)

## Step 5: Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

### Required Variables

```
SESSION_SECRET=your-strong-random-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
NODE_ENV=production
GOOGLE_CALLBACK_URL=https://qrcode.creators-lab.org/auth/google/callback
```

**Important**: 
- Generate a strong random string for `SESSION_SECRET` (you can use: `openssl rand -base64 32`)
- Replace `your-project-id` and `your-supabase-anon-key` with your actual Supabase values

### Environment Variable Settings

For each variable, make sure to:
- ✅ Select **Production**, **Preview**, and **Development** environments
- Click **Save**

## Step 6: Update Google OAuth Callback URL

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://qrcode.creators-lab.org/auth/google/callback
   ```
5. Click **Save**

## Step 7: Configure Custom Domain

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your domain: `qrcode.creators-lab.org`
3. Follow Vercel's instructions to configure DNS:
   - Add a CNAME record pointing to Vercel
   - Or add A records as instructed by Vercel
4. Wait for DNS propagation (can take a few minutes to hours)

## Step 8: Redeploy to Production

After setting environment variables and domain:

```bash
vercel --prod
```

Or trigger a redeploy from the Vercel dashboard (Settings → Deployments → Redeploy)

## Step 9: Verify Deployment

1. Visit `https://qrcode.creators-lab.org`
2. You should be redirected to the login page
3. Click "Sign in with Google"
4. After authentication, you should see the QR code generator
5. Test creating a QR code
6. Verify data appears in your Supabase dashboard

## Troubleshooting

### "Cannot GET /auth/google"
- Make sure environment variables are set in Vercel
- Redeploy after adding environment variables
- Check Vercel function logs

### "redirect_uri_mismatch" error
- Verify the callback URL in Google Cloud Console matches exactly
- Make sure you're using `https://` (not `http://`)
- Wait a few minutes for Google's changes to propagate

### "Supabase connection error"
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check Supabase project is active
- Verify tables exist in Supabase

### Sessions not persisting
- This is expected with the current memory-based session store
- For production, consider implementing database-backed sessions
- Or use Vercel KV for session storage

### Domain not working
- Check DNS records are correct
- Wait for DNS propagation (can take up to 48 hours)
- Verify domain is added in Vercel dashboard
- Check SSL certificate is issued (Vercel does this automatically)

## Post-Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Google OAuth callback URL updated
- [ ] Custom domain configured
- [ ] Supabase tables created
- [ ] Test login works
- [ ] Test QR code generation works
- [ ] Test QR code expiration works
- [ ] Verify data in Supabase dashboard

## Monitoring

- **Vercel Dashboard**: View deployments, logs, and analytics
- **Supabase Dashboard**: Monitor database usage and performance
- **Google Cloud Console**: Monitor OAuth usage

## Next Steps

Consider:
1. Setting up Vercel Analytics
2. Implementing database-backed sessions for better reliability
3. Setting up error monitoring (e.g., Sentry)
4. Adding rate limiting
5. Setting up automated backups for Supabase

