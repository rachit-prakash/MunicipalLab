# Environment Variables Configuration

## Overview
This document lists all required and optional environment variables for the application.

To get started quickly, copy the provided [`env.example`](../env.example) file into `.env.local`:
```bash
cp env.example .env.local
```
Then fill in the placeholders using the guidance below.

## Required Variables

### Database Configuration

```bash
DATABASE_URL=postgresql://postgres:password@aws-0-us-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
```

**Important for Cloudflare Pages:**
- ✅ MUST use connection pooler (`pooler.supabase.com`)
- ✅ MUST include `?pgbouncer=true` parameter
- ✅ MUST include `&sslmode=require` parameter

**Validate with:** `pnpm run validate:db`

**Get from:** [Supabase Dashboard](https://app.supabase.com/) → Settings → Database → Connection string (Transaction mode)

---

### Token Vault Key

```bash
TOKEN_VAULT_KEY=your-base64-encoded-32-byte-key-here
```

**Generate with:**
```bash
openssl rand -base64 32
```

**Purpose:** Encrypts/decrypts refresh tokens stored in database (AES-256-GCM)

**Security:** MUST be different between development and production!

---

### NextAuth Secret

```bash
NEXTAUTH_SECRET=your-nextauth-secret-here
```

**Generate with:**
```bash
openssl rand -base64 32
```

**Purpose:** JWT encryption and session management

**Security:** MUST be different between development and production!

---

### NextAuth URL

```bash
# Local development
NEXTAUTH_URL=http://localhost:3000

# Preview/Staging
NEXTAUTH_URL=https://devlegaside.municipallabs.ai

# Production
NEXTAUTH_URL=https://legaside.municipallabs.ai
```

**Purpose:** Canonical URL for OAuth callbacks

**Important:** Must match exactly (no trailing slash)

---

### Google OAuth Credentials

```bash
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

**Get from:** [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials

**Setup:** See [google-oauth-setup.md](./google-oauth-setup.md) for detailed instructions

**Required Scopes:**
- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.readonly`

**Redirect URIs to add:**
- `http://localhost:3000/api/auth/callback/google` (local)
- `https://devlegaside.municipallabs.ai/api/auth/callback/google` (preview)
- `https://legaside.municipallabs.ai/api/auth/callback/google` (production)

---

## Optional Variables

### Demo Mode

```bash
DEMO_MODE=1
```

**Purpose:** Enables synthetic demo data when Gmail access is unavailable

**Values:**
- `1` or `"1"` = Enabled
- `0`, `"0"`, or unset = Disabled

**Use case:** Testing UI without Gmail API access

---

### AI Assistant (OpenAI)

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

**Get from:** [OpenAI Platform](https://platform.openai.com/api-keys)

**Purpose:** Powers the AI assistant chatbot feature

**Required for:** `/api/assistant/chat` endpoint

---

### AI Assistant (OpenRouter - Alternative)

```bash
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxx
```

**Get from:** [OpenRouter](https://openrouter.ai/)

**Purpose:** Alternative to OpenAI for AI assistant

**Note:** Use either OpenAI OR OpenRouter, not both

---

### Node Environment

```bash
NODE_ENV=production
```

**Values:**
- `development` = Local development
- `production` = Production deployment

**Note:** Usually auto-set by hosting provider (Cloudflare Pages)

---

## Environment-Specific Configuration

### Local Development (`.env.local`)

```bash
# Database - can use direct connection locally
DATABASE_URL=postgresql://postgres:password@localhost:5432/legaside

# Or use Supabase pooler for consistency
DATABASE_URL=postgresql://postgres:password@aws-0-us-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require

# Token encryption (dev key)
TOKEN_VAULT_KEY=dev-key-generate-with-openssl-rand-base64-32

# NextAuth (dev secret)
NEXTAUTH_SECRET=dev-secret-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (can use dev or prod credentials)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret

# Demo mode (useful for testing)
DEMO_MODE=1

# AI Assistant (optional)
OPENAI_API_KEY=sk-your-key

NODE_ENV=development
```

---

### Preview/Staging (Cloudflare Pages Environment)

Set in Cloudflare Dashboard → Pages → Settings → Environment variables → Preview

```bash
DATABASE_URL=postgresql://...pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
TOKEN_VAULT_KEY=staging-key-different-from-prod
NEXTAUTH_SECRET=staging-secret-different-from-prod
NEXTAUTH_URL=https://devlegaside.municipallabs.ai
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
DEMO_MODE=0
OPENAI_API_KEY=sk-your-key
```

---

### Production (Cloudflare Pages Environment)

Set in Cloudflare Dashboard → Pages → Settings → Environment variables → Production

```bash
DATABASE_URL=postgresql://...pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
TOKEN_VAULT_KEY=production-key-different-from-staging
NEXTAUTH_SECRET=production-secret-different-from-staging
NEXTAUTH_URL=https://legaside.municipallabs.ai
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
DEMO_MODE=0
OPENAI_API_KEY=sk-your-key
```

---

## Security Best Practices

### ✅ Do's

- ✅ Generate new secrets for each environment
- ✅ Use connection pooler for Cloudflare/serverless
- ✅ Store secrets in Cloudflare Pages settings (never in code)
- ✅ Rotate secrets periodically (every 90 days)
- ✅ Use different Google OAuth apps for dev vs prod
- ✅ Validate DATABASE_URL with `pnpm run validate:db`
- ✅ Keep `.env.local` in `.gitignore`

### ❌ Don'ts

- ❌ Don't commit `.env.local` or `.env.production` to Git
- ❌ Don't reuse secrets between environments
- ❌ Don't use direct database connection in serverless
- ❌ Don't share secrets in plain text (use encrypted channels)
- ❌ Don't log environment variables (contains secrets)
- ❌ Don't use weak or short secrets

---

## Validation

### Validate Database URL

```bash
pnpm run validate:db
```

This script checks:
- Connection pooler usage
- `pgbouncer=true` parameter
- `sslmode=require` parameter
- General format validity

### Test Database Connection

Create `test-connection.js`:

```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected successfully:', res.rows[0]);
  pool.end();
});
```

Run:
```bash
node test-connection.js
```

---

## Troubleshooting

### "Missing environment variable" error

**Cause:** Required variable not set

**Solution:** Check that all required variables are set in Cloudflare Pages settings

### "Invalid DATABASE_URL" error

**Cause:** Malformed connection string

**Solution:** Run `pnpm run validate:db` and fix issues

### OAuth redirect_uri_mismatch

**Cause:** `NEXTAUTH_URL` doesn't match Google OAuth redirect URI

**Solution:** Ensure exact match in Google Cloud Console and environment variable

### "Too many connections" database error

**Cause:** Not using connection pooler

**Solution:** Switch to pooler URL with `?pgbouncer=true`

### Session/JWT errors

**Cause:** Missing or invalid `NEXTAUTH_SECRET`

**Solution:** Generate new secret with `openssl rand -base64 32`

---

## Creating Your `.env.local` File

1. Run `cp env.example .env.local`
2. Fill in each value following the instructions above
3. Validate with: `pnpm run validate:db`
4. Test with: `pnpm dev`

---

## References

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [NextAuth.js Environment Variables](https://next-auth.js.org/configuration/options)
- [Google OAuth Setup](./google-oauth-setup.md)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)

