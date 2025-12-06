# Cloudflare Pages Deployment Guide

## Overview
This guide walks you through deploying Legaside to Cloudflare Pages with custom domains (`legaside.municipallabs.ai` for production and `devlegaside.municipallabs.ai` for preview).

## Prerequisites

- [ ] GitHub account with this repository
- [ ] Cloudflare account (free tier is sufficient)
- [ ] Domain `municipallabs.ai` (purchase from Cloudflare)
- [ ] Supabase project with PostgreSQL database
- [ ] Google OAuth credentials configured

## Step 1: Purchase Domain

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Domain Registration** → **Register Domain**
3. Search for `municipallabs.ai`
4. Complete the purchase (~$10-15/year)
5. Domain will automatically use Cloudflare nameservers (no configuration needed)

## Step 2: Create Cloudflare Pages Project

### Option A: Via Dashboard (Recommended)

1. Go to **Workers & Pages** → **Create application** → **Pages**
2. Click **Connect to Git**
3. Select your GitHub account and this repository
4. Configure build settings:
   - **Project name:** `legaside`
   - **Production branch:** `main` (or `master`)
   - **Build command:** `pnpm run pages:build`
   - **Build output directory:** `.vercel/output/static`
   - **Root directory:** `/` (leave empty)
   - **Node.js version:** `20` or later

### Option B: Via CLI

First, install Wrangler globally (if not already):
```bash
pnpm add -g wrangler
```

Authenticate with Cloudflare:
```bash
wrangler login
```

Create and deploy the project:
```bash
# Build the application
pnpm run pages:build

# Create the Pages project
npx wrangler pages project create legaside

# Deploy
npx wrangler pages deploy .vercel/output/static --project-name=legaside
```

## Step 3: Configure Environment Variables

In the Cloudflare Dashboard, go to your Pages project → **Settings** → **Environment variables**.

Add the following variables for **both Production and Preview** environments:

### Required Variables

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | Your Supabase connection string | `postgresql://user:pass@host.supabase.co:5432/postgres?sslmode=require` |
| `TOKEN_VAULT_KEY` | Base64-encoded 32-byte key | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | Random secret string | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL | `https://legaside.municipallabs.ai` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | `GOCSPX-xxxxxxxxxxxxx` |

### Optional Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `DEMO_MODE` | `1` or `0` | Enable demo data when Gmail is unavailable |
| `OPENAI_API_KEY` | OpenAI API key | For AI assistant feature |
| `OPENROUTER_API_KEY` | OpenRouter API key | Alternative to OpenAI |
| `NODE_ENV` | `production` | Usually auto-set by Cloudflare |

### Preview Environment Overrides

For the **Preview** environment, override these:
- `NEXTAUTH_URL` = `https://devlegaside.municipallabs.ai`

**Important Security Notes:**
- ⚠️ Generate a NEW `NEXTAUTH_SECRET` for production (don't reuse from development)
- ⚠️ Generate a NEW `TOKEN_VAULT_KEY` for production
- ⚠️ Never commit these secrets to Git
- ⚠️ Ensure Supabase `DATABASE_URL` uses connection pooler (`?pgbouncer=true`)

## Step 4: Configure Custom Domains

### Production Domain (legaside.municipallabs.ai)

1. In your Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter `legaside.municipallabs.ai`
4. Click **Continue**
5. Cloudflare will automatically create the DNS records (since domain is on Cloudflare)
6. Wait for SSL certificate provisioning (~2-5 minutes)

### Preview Domain (devlegaside.municipallabs.ai)

1. Click **Set up a custom domain** again
2. Enter `devlegaside.municipallabs.ai`
3. In the dropdown, select **Preview environment**
4. Click **Continue**
5. DNS records will be auto-created
6. Wait for SSL certificate provisioning

### Landing Page Domain (municipallabs.ai)

This will be configured separately when you deploy your landing page repository. The root domain will point to that deployment.

## Step 5: Configure Google OAuth

Follow the detailed instructions in [`google-oauth-setup.md`](./google-oauth-setup.md).

Quick summary:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client
4. Add redirect URIs:
   - `https://legaside.municipallabs.ai/api/auth/callback/google`
   - `https://devlegaside.municipallabs.ai/api/auth/callback/google`
5. Save changes

## Step 6: Configure Branch Deployments

1. In Pages project settings, go to **Builds & deployments**
2. Set **Production branch:** `main`
3. Enable **Automatic deployments**
4. Configure preview branches:
   - All branches will get automatic preview deployments
   - Preview URLs format: `<branch-name>.<project>.pages.dev`
   - `devlegaside.municipallabs.ai` points to your preview branch

## Step 7: Set Up Cloudflare Security

### Enable Security Features

1. Go to your domain → **SSL/TLS**
   - Set mode to **Full (strict)**
   - Enable **Always Use HTTPS**
   - Enable **Automatic HTTPS Rewrites**
   - Set **Minimum TLS Version** to `1.2`

2. Go to **Security** → **Settings**
   - Enable **Bot Fight Mode** (free tier)
   - Consider enabling **Email Obfuscation**

### Configure Rate Limiting (Optional but Recommended)

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Create rules to protect API endpoints:

**Rule 1: Protect Authentication**
- If: Request URI Path contains `/api/auth/`
- Then: Block
- When: Rate exceeds 10 requests per minute per IP

**Rule 2: Protect Gmail API**
- If: Request URI Path contains `/api/gmail/`
- Then: Block
- When: Rate exceeds 30 requests per minute per IP

**Rule 3: Protect AI Assistant**
- If: Request URI Path contains `/api/assistant/`
- Then: Block
- When: Rate exceeds 20 requests per minute per IP

## Step 8: Verify Supabase Configuration

### Connection String Format

Your Supabase `DATABASE_URL` should use the connection pooler for serverless environments:

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
```

Key components:
- ✅ Uses `pooler.supabase.com` (not direct connection)
- ✅ Includes `?pgbouncer=true`
- ✅ Includes `sslmode=require`

### Enable Row Level Security (RLS)

Verify RLS is enabled on all tables in your Supabase dashboard:
1. Go to Supabase Dashboard → **Table Editor**
2. For each table, check that RLS is enabled
3. Review RLS policies to ensure `tenant_id` filtering is in place

## Step 9: Test Your Deployment

### Production Testing
1. Visit `https://legaside.municipallabs.ai`
2. Test authentication flow (sign in with Google)
3. Verify dashboard loads with data or demo mode
4. Test threads page
5. Test AI assistant (if configured)
6. Check browser console for errors

### Preview Testing
1. Create a new branch or push to preview branch
2. Wait for build to complete
3. Visit `https://devlegaside.municipallabs.ai`
4. Test the same features as production

### Monitor Build Logs
- Check build logs in Cloudflare Pages dashboard
- Look for any warnings or errors
- Verify all environment variables are loaded

## Step 10: Set Up Background Sync (Important!)

**Note:** The `scripts/sync.ts` background sync script won't run automatically on Cloudflare Pages.

### Option A: Cloudflare Workers Cron Triggers (Recommended)

Create a separate Cloudflare Worker:

1. Create `workers/gmail-sync.ts`:
```typescript
import { sync } from './sync-logic'

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await sync(env)
  }
}
```

2. Configure in `wrangler.toml`:
```toml
[triggers]
crons = ["0 */6 * * *"]  # Run every 6 hours
```

### Option B: GitHub Actions (Alternative)

Create `.github/workflows/sync.yml`:
```yaml
name: Gmail Sync
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm run sync
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          # Add other required env vars
```

## Step 11: Monitoring & Maintenance

### Regular Checks
- [ ] Monitor Cloudflare Analytics for traffic and errors
- [ ] Check Supabase dashboard for database performance
- [ ] Review audit logs in your database
- [ ] Monitor build success rate

### Monthly Maintenance
- [ ] Update dependencies: `pnpm outdated && pnpm update`
- [ ] Review and rotate secrets if needed
- [ ] Check Supabase connection pool usage
- [ ] Review Cloudflare analytics for suspicious activity

### Cost Monitoring
- Cloudflare Pages: Free tier (500 builds/month, unlimited bandwidth)
- Supabase: Monitor database size and connection usage
- Consider upgrading if you hit free tier limits

## Troubleshooting

### Build Fails
- Check build logs in Cloudflare dashboard
- Verify Node.js version is 18+
- Ensure all dependencies are in `package.json`
- Try building locally: `pnpm run pages:build`

### Authentication Issues
- Verify `NEXTAUTH_URL` matches your domain exactly
- Check Google OAuth redirect URIs are correct
- Ensure `NEXTAUTH_SECRET` is set
- Check browser cookies are enabled

### Database Connection Errors
- Verify `DATABASE_URL` uses connection pooler
- Check Supabase project is active
- Verify IP allowlist in Supabase (should allow all for serverless)
- Test connection from local environment

### Gmail API Not Working
- Check `googleapis` package compatibility with Workers runtime
- Verify Gmail API is enabled in Google Cloud Console
- Check refresh tokens are being stored
- Review API quota limits in Google Cloud Console

### Environment Variables Not Loading
- Ensure variables are set for the correct environment (Production/Preview)
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

## Next Steps

After successful deployment:

1. **Set up monitoring:**
   - Consider adding Sentry for error tracking
   - Set up Cloudflare email alerts for build failures
   - Configure Supabase alerts for database issues

2. **Improve security:**
   - Implement Content Security Policy (CSP) headers
   - Set up Web Application Firewall (WAF) rules
   - Enable DDoS protection (Pro plan)

3. **Optimize performance:**
   - Enable Cloudflare caching rules
   - Configure image optimization
   - Set up cache purging strategies

4. **Plan for scale:**
   - Monitor Supabase connection pool
   - Consider upgrading Cloudflare plan for advanced features
   - Plan for database scaling

## Useful Commands

```bash
# Build for Cloudflare Pages
pnpm run pages:build

# Test Cloudflare runtime locally
pnpm run pages:dev

# Deploy to Cloudflare Pages
pnpm run pages:deploy

# Check build output
ls -la .vercel/output/static

# View Wrangler version
npx wrangler --version

# View deployment logs
npx wrangler pages deployment list --project-name=legaside
```

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Google OAuth Setup Guide](./google-oauth-setup.md)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Cloudflare Pages build logs
3. Check Supabase logs
4. Review this repository's issues on GitHub

