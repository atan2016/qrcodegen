# How to Deploy the Debug Endpoint

The `/api/auth/debug` endpoint is in the code but needs to be deployed.

## Option 1: Redeploy in Vercel Dashboard (Fastest)

1. Go to **Vercel Dashboard** → Your Project (`qrcodegen`)
2. Click on **Deployments** tab (top menu)
3. Find the latest deployment
4. Click the **three dots (⋯)** menu on the right
5. Click **Redeploy**
6. Wait for deployment to complete (usually 1-2 minutes)

After redeploy, the `/api/auth/debug` endpoint will be available.

## Option 2: Push a Commit (If you have Git setup)

If your project is connected to Git:

1. Make a small change (or just add a comment) to any file
2. Commit the change:
   ```bash
   git add .
   git commit -m "Deploy session debug endpoint"
   git push
   ```
3. Vercel will automatically deploy

## Option 3: Use Vercel CLI

If you have Vercel CLI installed:

```bash
vercel --prod
```

## After Deploying

1. Wait 1-2 minutes for deployment to complete
2. Visit: `https://qrcodegen.creators-lab.org/api/auth/debug`
3. You should see JSON with session configuration

## What You'll See

If everything is configured correctly:
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

If there's a problem:
```json
{
  "hasSessionStore": false,
  "sessionStoreType": "Memory",
  "hasDatabaseUrl": true,  // or false
  ...
}
```

