# Cloudflare Deployment Quick Start 🚀

## You're Ready to Deploy!

Your application is now configured for Cloudflare Pages. Here's what was set up:

### ✅ What's Been Done

1. **Cloudflare Adapter Installed**

   - `@cloudflare/next-on-pages` package added
   - `wrangler` CLI tool installed
   - Build scripts configured in `package.json`

2. **Configuration Files Created**

   - `wrangler.toml` - Cloudflare Pages configuration
   - Security headers added to `middleware.ts`
   - Database pool optimized for serverless in `lib/db.ts`
   - Auth configuration documented in `lib/auth.ts`

3. **Documentation Created**

   - Complete deployment guide: `docs/cloudflare-deployment.md`
   - Google OAuth setup: `docs/google-oauth-setup.md`
   - Supabase configuration: `docs/supabase-setup.md`
   - Environment variables guide: `docs/environment-variables.md`

4. **Helper Scripts Added**
   - `pnpm run validate:db` - Validates your DATABASE_URL format
   - `pnpm run pages:build` - Builds for Cloudflare Pages
   - `pnpm run pages:dev` - Tests locally with Cloudflare runtime
   - `pnpm run pages:deploy` - Deploys to Cloudflare Pages

---

## 🎯 Next Steps (Your Part!)

### 1. Buy Domain (5 minutes)

Go to Cloudflare and purchase `municipallabs.ai`:

- Cost: ~$10-15/year
- Auto-configured DNS (no setup needed!)

### 2. Prepare Environment Variables (10 minutes)

Start from the committed template:

```bash
cp env.example .env.local
```

Then populate the values. You'll need these ready:

```bash
# Generate new production secrets (run these commands):
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -base64 32  # For TOKEN_VAULT_KEY

# Get from Supabase Dashboard:
# Settings → Database → Connection string (Transaction mode)
DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require"

# Copy from your existing Google OAuth app:
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

**Validate your database URL:**

```bash
pnpm run validate:db
```

### 3. Run Helper Database Scripts (5 minutes)

These commands ensure your Supabase/Postgres schema matches the application:

```bash
pnpm install
pnpm run validate:db
node scripts/fix-db-constraints.js
node scripts/add-timezone-column.js
# Optional but recommended analytics prep
pnpm analyze:messages
pnpm test:analytics
```

Re-run them whenever you create a new environment or refresh a database snapshot.

### 4. Update Google OAuth (5 minutes)

Add these redirect URIs in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

```
https://legaside.municipallabs.ai/api/auth/callback/google
https://devlegaside.municipallabs.ai/api/auth/callback/google
```

### 5. Deploy to Cloudflare (15 minutes)

**Option A: Via Dashboard (Recommended for first time)**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → Create → Connect to Git
3. Select your repository
4. Configure:
   - Build command: `pnpm run pages:build`
   - Build output: `.vercel/output/static`
5. Add environment variables (from step 2)
6. Deploy!

**Option B: Via CLI (For subsequent deploys)**

```bash
# Login to Cloudflare
npx wrangler login

# Build the app
pnpm run pages:build

# Deploy
pnpm run pages:deploy
```

### 6. Configure Custom Domains (5 minutes)

In Cloudflare Pages project:

1. Go to Custom domains
2. Add `legaside.municipallabs.ai` → Production
3. Add `devlegaside.municipallabs.ai` → Preview
4. Wait for SSL certificates (~2-5 minutes)

### 7. Test Your Deployment (10 minutes)

Visit `https://legaside.municipallabs.ai` and test:

- ✅ Sign in with Google
- ✅ Dashboard loads
- ✅ Threads page works
- ✅ Database connection works
- ✅ No console errors

---

## 📚 Detailed Guides

Stuck? Check these comprehensive guides:

- **[Complete Deployment Guide](./cloudflare-deployment.md)** - Full step-by-step with screenshots
- **[Google OAuth Setup](./google-oauth-setup.md)** - Detailed OAuth configuration
- **[Supabase Setup](./supabase-setup.md)** - Database optimization for serverless
- **[Environment Variables](./environment-variables.md)** - All config options explained

---

## 🔒 Security Checklist

Before going live, ensure:

- [ ] Generated NEW `NEXTAUTH_SECRET` for production (different from dev)
- [ ] Generated NEW `TOKEN_VAULT_KEY` for production (different from dev)
- [ ] Using Supabase connection pooler (`?pgbouncer=true`)
- [ ] SSL enforced (`sslmode=require` in DATABASE_URL)
- [ ] Google OAuth only allows production domains (no localhost)
- [ ] RLS enabled on all database tables
- [ ] Tested authentication flow end-to-end

---

## ⚡ Quick Commands

```bash
# Validate database configuration
pnpm run validate:db

# Build for Cloudflare
pnpm run pages:build

# Test locally with Cloudflare runtime
pnpm run pages:dev

# Deploy to Cloudflare
pnpm run pages:deploy

# Check deployment status
npx wrangler pages deployment list

# View live logs
npx wrangler pages deployment tail
```

---

## 🆘 Common Issues

### Build fails with peer dependency error

This is expected (Next.js 16 is very new). We installed with `--legacy-peer-deps` which works fine.

### "Too many database connections"

You're using direct connection instead of pooler. Run `pnpm run validate:db` to check.

### OAuth redirect_uri_mismatch

Double-check that:

1. Google OAuth redirect URI matches exactly
2. `NEXTAUTH_URL` in Cloudflare matches your domain
3. No trailing slashes

### Environment variables not loading

Redeploy after adding new variables - Cloudflare needs a rebuild.

---

## 🎉 After Deployment

### Monitor Your App

- Check Cloudflare Analytics dashboard
- Monitor Supabase connection pool usage
- Review audit logs in database

### Set Up Background Sync

The `scripts/sync.ts` won't run automatically on Pages. Options:

1. **Cloudflare Workers Cron** (recommended)
2. **GitHub Actions** (simpler)

See [Deployment Guide](./cloudflare-deployment.md#step-10-set-up-background-sync-important) for details.

### Optional Enhancements

- Set up Sentry for error tracking
- Configure rate limiting in Cloudflare WAF
- Add monitoring alerts
- Enable Cloudflare Web Analytics

---

## 💰 Costs

**Free Tier Includes:**

- Cloudflare Pages: Unlimited bandwidth, 500 builds/month
- Domain: ~$10-15/year one-time
- Supabase Free: 500MB database, good for MVP

You're likely fine on free tiers to start! 🎈

---

## 📞 Need Help?

1. Check the detailed guides in `docs/`
2. Review Cloudflare build logs
3. Check Supabase dashboard for DB issues
4. Test locally first: `pnpm run pages:dev`

---

## 🌟 You're All Set!

The hard part (configuration) is done. Now just:

1. Buy the domain
2. Add environment variables
3. Deploy!

Your app will be live at `https://legaside.municipallabs.ai` in about an hour. 🚀

Good luck! 🎊
