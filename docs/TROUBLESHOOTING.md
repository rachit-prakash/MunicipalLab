# Troubleshooting Guide

This guide covers common issues and solutions for the MunicipalLabs CRM application.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Database Issues](#database-issues)
- [Gmail API Issues](#gmail-api-issues)
- [Development Issues](#development-issues)
- [Performance Issues](#performance-issues)

---

## Authentication Issues

### Google Sign-in Failed

**Error Message:**
```
Google sign-in failed. Check OAuth client, redirect URI, and environment variables.
```

**Root Causes:**
1. Missing or incorrect environment variables
2. Database connection failure during OAuth callback
3. Google OAuth configuration issues

**Solutions:**

#### 1. Check Environment Variables

Verify `.env.local` exists and contains:

```bash
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
DATABASE_URL=postgresql://user:password@localhost:5432/municipallabs_crm
```

**Common mistakes:**
- ❌ Missing quotes where not needed
- ❌ Extra spaces around `=`
- ❌ Wrong port in `NEXTAUTH_URL`
- ❌ Missing `DATABASE_URL`

#### 2. Test Database Connection

```bash
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()', (err, res) => { if (err) console.error('❌ Failed:', err.message); else console.log('✅ Connected!'); pool.end(); });"
```

If this fails, see [Database Connection Timeout](#database-connection-timeout).

#### 3. Verify OAuth Configuration

See [OAuth Setup Guide](./OAUTH_SETUP.md) for complete setup.

**Quick checklist:**
- ✅ Gmail API enabled in Google Cloud Console
- ✅ OAuth consent screen configured
- ✅ Your email added as test user
- ✅ Redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- ✅ Client ID and Secret copied correctly

#### 4. Restart Development Server

```bash
# Stop the server (Ctrl+C)
pnpm dev
```

---

### "Connection terminated due to connection timeout"

**Full Error:**
```
[next-auth][error][OAUTH_CALLBACK_HANDLER_ERROR]
Connection terminated due to connection timeout
at pg-pool/index.js:45:11
```

**Cause:** Database is not accessible when NextAuth tries to save user info during OAuth callback.

**Solutions:**

1. **Check if PostgreSQL is running:**
```bash
# Windows
sc query postgresql-x64-15

# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

2. **Start PostgreSQL:**
```bash
# Windows (as Administrator)
net start postgresql-x64-15

# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

3. **Verify DATABASE_URL is correct:**
```bash
# Test connection
psql "postgresql://user:password@localhost:5432/municipallabs_crm" -c "SELECT 1"
```

4. **Check firewall/network:**
- Ensure PostgreSQL accepts connections on port 5432
- Check `pg_hba.conf` allows local connections
- Verify `postgresql.conf` has `listen_addresses = 'localhost'`

5. **Check connection pool settings:**

The app uses these timeouts (in `lib/db.ts`):
- Connection timeout: 10 seconds
- Idle timeout: 30 seconds

If database is slow, you may need to adjust these.

---

### "Invalid session" or "Unauthorized"

**Symptoms:**
- Signed in but API calls return 401
- Session expires immediately

**Solutions:**

1. **Check NEXTAUTH_SECRET:**
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

2. **Verify NEXTAUTH_URL matches:**
```bash
# Should be
NEXTAUTH_URL=http://localhost:3000
# Not
NEXTAUTH_URL=http://localhost:3000/  # ❌ No trailing slash
```

3. **Clear browser cookies:**
- Open DevTools → Application → Cookies
- Delete all cookies for localhost:3000
- Try signing in again

4. **Check JWT callback:**

View terminal logs for errors in JWT callback. Common issues:
- Database query failures
- Missing tenant for user
- Token encryption failures

---

## Database Issues

### Database Connection Timeout

See ["Connection terminated due to connection timeout"](#connection-terminated-due-to-connection-timeout) above.

---

### "permission denied for table users"

**Error:**
```sql
permission denied for table users
```

**Solution:**

```sql
-- Connect as postgres superuser
psql -U postgres municipallabs_crm

-- Grant privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON DATABASE municipallabs_crm TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;
```

---

### "relation does not exist"

**Error:**
```sql
relation "users" does not exist
```

**Cause:** Database schema not created.

**Solution:**

Contact your database administrator to apply the schema. The schema includes these tables:
- tenants
- users
- gmail_accounts
- threads
- messages
- topics
- roles
- memberships
- audit_logs

---

### "duplicate key value violates unique constraint"

**Error:**
```
duplicate key value violates unique constraint "users_pkey"
```

**Cause:** Trying to insert a record that already exists.

**Solution:**

This usually happens during development. The app uses `ON CONFLICT` clauses to handle this, but if you see this error:

1. Check if user/record already exists
2. Use `UPSERT` pattern (INSERT ... ON CONFLICT DO UPDATE)
3. Clear test data if needed

---

## Gmail API Issues

### "Invalid Credentials" or "401 Unauthorized"

**Symptoms:**
- Can sign in, but Gmail inbox shows error
- API calls to Gmail fail

**Cause:** Access token expired and refresh token is missing or invalid.

**Solutions:**

1. **Sign out and sign in again:**
   - This forces a new OAuth flow
   - Ensures fresh refresh token is saved

2. **Check OAuth scopes:**

   The app requires:
   - `https://www.googleapis.com/auth/gmail.readonly`

   Verify in `lib/auth.ts`:
   ```typescript
   scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly"
   ```

3. **Ensure offline access:**

   In `lib/auth.ts`, verify:
   ```typescript
   authorization: {
     params: {
       access_type: "offline",  // ✅ Required for refresh token
       prompt: "consent",
     }
   }
   ```

4. **Check refresh token in database:**
```sql
SELECT email, encrypted_refresh_token IS NOT NULL as has_token 
FROM gmail_accounts;
```

---

### "Insufficient Permission" (403)

**Error:**
```json
{
  "error": {
    "code": 403,
    "message": "Insufficient Permission"
  }
}
```

**Cause:** User didn't grant Gmail permissions during OAuth.

**Solutions:**

1. **Sign out and sign in again**
2. **Grant all permissions** when prompted
3. **Check if user revoked access:**
   - Visit: https://myaccount.google.com/permissions
   - Look for your app
   - If missing, sign in again

---

### "Daily Limit Exceeded" (429)

**Error:**
```json
{
  "error": {
    "code": 429,
    "message": "Daily Limit for Unauthenticated Use Exceeded"
  }
}
```

**Cause:** Hit Gmail API rate limits.

**Gmail API Limits:**
- 250 quota units per user per second
- 1 billion quota units per day

**Solutions:**

1. **Reduce sync frequency**
2. **Implement exponential backoff** (already in code)
3. **Request quota increase** in Google Cloud Console
4. **Use batch requests** where possible

---

## Development Issues

### Port 3000 Already in Use

**Error:**
```
Port 3000 is already in use
```

**Solutions:**

1. **Kill the process:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

2. **Use different port:**
```bash
PORT=3001 pnpm dev
```

---

### Hot Reload Not Working

**Symptoms:**
- Changes not reflecting
- Page not refreshing

**Solutions:**

1. **Clear `.next` directory:**
```bash
rm -rf .next
pnpm dev
```

2. **Check file watchers (Linux):**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

3. **Restart dev server**

---

### Module Not Found

**Error:**
```
Module not found: Can't resolve '@/...'
```

**Solutions:**

1. **Reinstall dependencies:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

2. **Check `tsconfig.json` paths:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

### TypeScript Errors

**Error:**
```
Type 'X' is not assignable to type 'Y'
```

**Solutions:**

1. **Restart TypeScript server** (VS Code):
   - `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

2. **Check type definitions:**
```bash
pnpm add -D @types/node @types/react
```

3. **Clear TypeScript cache:**
```bash
rm -rf node_modules/.cache
```

---

## Performance Issues

### Slow Database Queries

**Symptoms:**
- Pages load slowly
- API timeouts

**Solutions:**

1. **Check indexes:**

   The schema includes indexes on:
   - `users(tenant_id, email)`
   - `threads(tenant_id, user_id, topic_id, status)`
   - `messages(thread_id, tenant_id)`
   - `audit_logs(tenant_id, actor_user_id)`

2. **Analyze slow queries:**
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();

-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

3. **Optimize connection pool:**

   Adjust in `lib/db.ts`:
   ```typescript
   max: 10,  // Increase if needed
   ```

---

### Memory Leaks

**Symptoms:**
- App gets slower over time
- High memory usage

**Solutions:**

1. **Check for unclosed connections:**

   The app uses connection pooling and should auto-close. Verify:
   ```typescript
   // Always use withTenant or query functions
   // They handle connection release
   ```

2. **Restart dev server regularly**

3. **Monitor with:**
```bash
node --inspect pnpm dev
# Open chrome://inspect
```

---

## Getting Help

If you're still stuck:

1. **Check logs:**
   - Browser console (F12)
   - Terminal (dev server logs)
   - PostgreSQL logs

2. **Enable debug mode:**
```bash
DEBUG=* pnpm dev
```

3. **Create minimal reproduction:**
   - Isolate the issue
   - Test with minimal code

4. **Check documentation:**
   - [Setup Guide](./SETUP.md)
   - [OAuth Setup](./OAUTH_SETUP.md)
   - [Database Setup](./DATABASE_SETUP.md)
   - [Architecture](./ARCHITECTURE.md)

---

## Quick Diagnostic Checklist

Use this checklist to diagnose issues:

```bash
# 1. Environment variables
cat .env.local  # Should contain all required vars

# 2. Database connection
psql $DATABASE_URL -c "SELECT 1"

# 3. PostgreSQL running
pg_isready

# 4. Node version
node --version  # Should be 18.17+

# 5. Dependencies installed
ls node_modules | wc -l  # Should be > 0

# 6. Port available
lsof -i :3000  # Should be empty

# 7. Google OAuth configured
# Check Google Cloud Console

# 8. Clear caches
rm -rf .next node_modules/.cache
```


