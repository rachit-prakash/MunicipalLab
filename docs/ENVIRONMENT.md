# Environment Variables Reference

Complete reference for all environment variables used in the MunicipalLabs CRM application.

## Required Variables

These variables **must** be set for the application to function.

### `NEXTAUTH_SECRET`

**Purpose:** Encryption key for NextAuth JWT tokens

**Format:** Random base64 string (minimum 32 characters)

**Example:**
```bash
NEXTAUTH_SECRET=37V/EcDhrcM3Sb7aVXfgeIsKSYEbcxm/dsUK39H9J0U=
```

**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Security:**
- ⚠️ Never commit to git
- ⚠️ Use different secrets for dev/staging/production
- ⚠️ Rotate periodically
- ⚠️ If exposed, all sessions become invalid

---

### `NEXTAUTH_URL`

**Purpose:** Base URL of the application (used by NextAuth for redirects)

**Format:** Full URL including protocol

**Examples:**
```bash
# Development
NEXTAUTH_URL=http://localhost:3000

# Production
NEXTAUTH_URL=https://crm.yourdomain.com
```

**Important:**
- ❌ No trailing slash
- ✅ Must match the domain users access
- ✅ Must match OAuth redirect URI base

---

### `GOOGLE_CLIENT_ID`

**Purpose:** Google OAuth 2.0 Client ID

**Format:** String ending in `.apps.googleusercontent.com`

**Example:**
```bash
GOOGLE_CLIENT_ID=123456789-abc123xyz456.apps.googleusercontent.com
```

**Obtain:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Create OAuth Client ID (Web application)
4. Copy the Client ID

**See:** [OAuth Setup Guide](./OAUTH_SETUP.md)

---

### `GOOGLE_CLIENT_SECRET`

**Purpose:** Google OAuth 2.0 Client Secret

**Format:** String starting with `GOCSPX-`

**Example:**
```bash
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789
```

**Obtain:**
1. Same process as Client ID
2. Copy the Client Secret from Google Cloud Console

**Security:**
- ⚠️ Never commit to git
- ⚠️ Never expose in client-side code
- ⚠️ Rotate if compromised

---

### `DATABASE_URL`

**Purpose:** PostgreSQL database connection string

**Format:** PostgreSQL connection URI

**Examples:**
```bash
# Local development
DATABASE_URL=postgresql://crm_user:password@localhost:5432/municipallabs_crm

# Hosted (with SSL)
DATABASE_URL=postgresql://user:pass@host.region.provider.com:5432/dbname?sslmode=require

# With connection pooling
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require&pool_timeout=10
```

**Format Breakdown:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?[params]
```

**Parameters:**
- `sslmode=require` - Force SSL connection (recommended for production)
- `sslmode=disable` - No SSL (local dev only)
- `pool_timeout` - Connection timeout in seconds
- `connect_timeout` - Initial connection timeout

**Providers:**
- [Supabase](https://supabase.com) - Free tier available
- [Neon](https://neon.tech) - Serverless Postgres
- [Railway](https://railway.app) - Simple deployment
- AWS RDS, Google Cloud SQL - Enterprise

**See:** [Database Setup Guide](./DATABASE_SETUP.md)

---

## Optional Variables

These variables have defaults or are only needed in specific scenarios.

### `NODE_ENV`

**Purpose:** Environment mode

**Values:**
- `development` (default for `pnpm dev`)
- `production` (default for `pnpm build && pnpm start`)
- `test` (for testing)

**Example:**
```bash
NODE_ENV=production
```

**Effects:**
- Development mode: Hot reload, verbose logging
- Production mode: Optimizations, less logging, strict SSL

**Usually set automatically - no need to set manually**

---

### `PORT`

**Purpose:** Port for development server

**Default:** `3000`

**Example:**
```bash
PORT=3001
```

**Usage:**
```bash
PORT=3001 pnpm dev
```

---

### `DEBUG`

**Purpose:** Enable debug logging

**Format:** Comma-separated list of debug namespaces

**Examples:**
```bash
# All debug logs
DEBUG=*

# Only database logs
DEBUG=db:*

# Multiple namespaces
DEBUG=db:*,auth:*
```

**Usage:**
```bash
DEBUG=* pnpm dev
```

---

## Environment Files

### `.env.local` (Recommended)

**Purpose:** Local development secrets

**Location:** Project root

**Example:**
```bash
# .env.local
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
DATABASE_URL=postgresql://user:pass@localhost:5432/municipallabs_crm
```

**Important:**
- ✅ Automatically loaded by Next.js
- ✅ Ignored by git (in `.gitignore`)
- ✅ Takes precedence over `.env`
- ❌ Never commit to version control

---

### `.env` (Not Recommended for Secrets)

**Purpose:** Default values, non-secret configuration

**Location:** Project root

**Example:**
```bash
# .env
# Default values (no secrets!)
NEXTAUTH_URL=http://localhost:3000
```

**Important:**
- ⚠️ Usually committed to git
- ⚠️ Don't put secrets here
- ⚠️ `.env.local` overrides this

---

### `.env.production`

**Purpose:** Production-specific non-secret config

**Example:**
```bash
# .env.production
NODE_ENV=production
```

**Important:**
- Only loaded in production mode
- Still use hosting provider's environment variables for secrets

---

## Loading Order

Next.js loads environment variables in this order (later overrides earlier):

1. `process.env` (system environment)
2. `.env.local` ⭐ **Use this for local dev**
3. `.env.development` or `.env.production` (based on NODE_ENV)
4. `.env`

---

## Security Best Practices

### ✅ Do:

1. **Use `.env.local` for development secrets**
   ```bash
   # .env.local (not committed)
   NEXTAUTH_SECRET=secret-value
   ```

2. **Use environment variables in production**
   - Set via hosting provider dashboard
   - Use secrets management (AWS Secrets Manager, etc.)

3. **Validate environment variables**
   ```typescript
   if (!process.env.NEXTAUTH_SECRET) {
     throw new Error('NEXTAUTH_SECRET is required');
   }
   ```

4. **Use different values per environment**
   - Dev uses localhost
   - Staging uses staging OAuth client
   - Production uses production OAuth client

5. **Add `.env.local` to `.gitignore`**
   ```gitignore
   .env.local
   .env*.local
   ```

### ❌ Don't:

1. ❌ **Don't commit secrets to git**
   ```bash
   # BAD - Don't do this
   git add .env.local
   ```

2. ❌ **Don't hardcode secrets**
   ```typescript
   // BAD
   const secret = "hardcoded-secret";
   
   // GOOD
   const secret = process.env.NEXTAUTH_SECRET;
   ```

3. ❌ **Don't expose secrets in client code**
   ```typescript
   // BAD - Client can see this
   const ClientComponent = () => {
     console.log(process.env.GOOGLE_CLIENT_SECRET); // ❌
   };
   ```

4. ❌ **Don't share `.env.local` via Slack/email**
   - Use secure password managers
   - Or share credentials verbally/in-person

---

## Production Deployment

### Vercel

Set environment variables in:
- Project Settings → Environment Variables

```bash
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DATABASE_URL=...
```

### Railway

Set in:
- Project → Variables

Railway auto-provides `DATABASE_URL` if you add a PostgreSQL service.

### Docker

Use `.env` file or pass via `-e`:

```bash
docker run \
  -e NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
  -e DATABASE_URL=$DATABASE_URL \
  your-image
```

Or use `docker-compose.yml`:

```yaml
version: '3'
services:
  app:
    image: your-image
    environment:
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      DATABASE_URL: ${DATABASE_URL}
    env_file:
      - .env.production.local
```

### AWS / GCP / Azure

Use their secrets management:
- AWS: Systems Manager Parameter Store / Secrets Manager
- GCP: Secret Manager
- Azure: Key Vault

---

## Verification

### Check if variables are loaded:

**Create a test file:**

```javascript
// test-env.js
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID?.slice(0, 20) + '...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
```

**Run:**
```bash
node -r dotenv/config test-env.js
```

---

## Troubleshooting

### Variables not loading?

1. **Check file name:** Must be `.env.local` (not `.env.local.txt`)
2. **Check location:** Must be in project root
3. **Restart dev server:** `Ctrl+C` then `pnpm dev`
4. **No spaces around `=`:**
   ```bash
   # BAD
   KEY = value
   
   # GOOD
   KEY=value
   ```
5. **No quotes needed (usually):**
   ```bash
   # Both work
   KEY=value
   KEY="value"
   ```

### "Missing environment variable" error?

```bash
# Check if variable is set
node -e "console.log(process.env.VARIABLE_NAME)"
```

### Variable has wrong value?

Check loading order - `.env.local` should override `.env`.

---

## Complete `.env.local` Template

```bash
# ===========================================
# MunicipalLabs CRM - Environment Variables
# ===========================================
# Copy this to .env.local and fill in your values

# NextAuth Configuration
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_SECRET=

# Local: http://localhost:3000
# Production: https://your-domain.com
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Credentials
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# PostgreSQL Database
# Local: postgresql://user:password@localhost:5432/municipallabs_crm
# Hosted: postgresql://user:password@host:5432/db?sslmode=require
DATABASE_URL=

# Optional: Debug logging
# DEBUG=*

# Optional: Custom port
# PORT=3000
```

---

## Next Steps

- [Setup Guide](./SETUP.md) - Complete setup instructions
- [OAuth Setup](./OAUTH_SETUP.md) - Google OAuth configuration
- [Database Setup](./DATABASE_SETUP.md) - Database configuration
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues


