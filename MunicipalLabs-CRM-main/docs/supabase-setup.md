# Supabase Configuration for Cloudflare Pages

## Overview
This guide helps you configure your Supabase PostgreSQL database for optimal compatibility with Cloudflare Pages' serverless runtime.

## Connection String Format

### ✅ Correct Format (with Connection Pooler)

For Cloudflare Pages and other serverless environments, you MUST use the connection pooler:

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
```

### ❌ Incorrect Format (Direct Connection)

This will cause connection pool exhaustion in serverless:

```
postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```

## Key Differences

| Component | Direct Connection | Connection Pooler |
|-----------|------------------|-------------------|
| Host | `db.[project-ref].supabase.co` | `aws-0-[region].pooler.supabase.com` |
| Query Params | Often missing | `?pgbouncer=true&sslmode=require` |
| Max Connections | Limited (~60-100) | High (thousands) |
| Best for | Long-lived servers | Serverless/Lambda |

## Finding Your Connection String

### Option 1: Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **Connection pooling** tab (not Session mode)
6. Choose **Transaction mode**
7. Copy the connection string

### Option 2: Manual Construction

If you have your direct connection string:

```
# Direct connection (OLD)
postgresql://postgres:password@db.abc123.supabase.co:5432/postgres

# Convert to pooled connection (NEW)
postgresql://postgres:password@aws-0-us-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
```

**Important:** The region in the pooler URL should match your Supabase project region.

## Required Query Parameters

### `pgbouncer=true`

This tells the `pg` library to use PgBouncer-compatible mode:
- Disables prepared statements (not supported by PgBouncer in transaction mode)
- Uses simple query protocol
- Required for connection pooling to work

### `sslmode=require`

Enforces SSL/TLS encryption:
- Ensures data in transit is encrypted
- Required by Supabase for security
- Prevents man-in-the-middle attacks

## Testing Your Connection String

### Test Locally

Create a test script `test-db-connection.js`:

```javascript
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Supabase uses valid certs, but this helps with testing
  }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to database');
    
    const result = await client.query('SELECT NOW() as now, version() as version');
    console.log('📅 Database time:', result.rows[0].now);
    console.log('🗄️  PostgreSQL version:', result.rows[0].version);
    
    // Test tenant setup
    const tenantCheck = await client.query('SELECT COUNT(*) as count FROM tenants');
    console.log('👥 Tenants in database:', tenantCheck.rows[0].count);
    
    client.release();
    await pool.end();
    console.log('✅ Connection test completed successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
```

Run the test:

```bash
# Set your connection string
export DATABASE_URL="postgresql://postgres:password@aws-0-us-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require"

# Run test
node test-db-connection.js
```

## Common Issues & Solutions

### Issue 1: "Too many connections"

**Cause:** Using direct connection instead of pooler

**Solution:** Switch to connection pooler URL with `?pgbouncer=true`

```bash
# Before (direct)
postgresql://...@db.abc123.supabase.co:5432/postgres

# After (pooled)
postgresql://...@aws-0-region.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
```

### Issue 2: "prepared statement already exists"

**Cause:** Missing `pgbouncer=true` parameter

**Solution:** Add the parameter to your connection string

```bash
DATABASE_URL="your-connection-string?pgbouncer=true&sslmode=require"
```

### Issue 3: SSL/TLS errors

**Cause:** Missing `sslmode=require` or certificate issues

**Solution:** Ensure `sslmode=require` is in connection string

### Issue 4: Connection timeouts in Cloudflare

**Cause:** Using wrong host or port

**Solution:** Verify you're using `pooler.supabase.com` (port 5432)

## Row Level Security (RLS) Configuration

Since this app uses multi-tenancy with RLS, ensure your policies are configured correctly:

### Enable RLS on All Tables

```sql
-- Enable RLS on all tenant tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### Verify RLS Policies

Your app uses `withTenant()` helper which sets `app.tenant_id`. Ensure policies check this:

```sql
-- Example policy for messages table
CREATE POLICY tenant_isolation ON messages
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Check existing policies:

```sql
-- View all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Connection Pool Configuration

The app uses a connection pool configured in `lib/db.ts`. Review these settings:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum connections (suitable for serverless)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

### Recommended Settings for Cloudflare

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Lower for serverless (each deployment creates a pool)
  idleTimeoutMillis: 10000, // Release idle connections quickly
  connectionTimeoutMillis: 5000, // Fail fast if connection issues
  ssl: {
    rejectUnauthorized: true // Enforce valid SSL certs
  }
});
```

## Monitoring Connection Usage

### In Supabase Dashboard

1. Go to **Database** → **Connection Pooling**
2. Monitor active connections
3. Check for connection spikes
4. Review slow queries

### In Your Application

Add logging to track connection usage:

```typescript
pool.on('connect', () => {
  console.log('New database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

pool.on('remove', () => {
  console.log('Database connection removed from pool');
});
```

## Best Practices

### ✅ Do's

- ✅ Use connection pooler for all serverless deployments
- ✅ Include `pgbouncer=true` parameter
- ✅ Include `sslmode=require` parameter
- ✅ Keep connection pool size small (5-10 for serverless)
- ✅ Release connections after use
- ✅ Use transactions for multi-step operations
- ✅ Always use `withTenant()` helper for queries

### ❌ Don'ts

- ❌ Don't use direct database connection in serverless
- ❌ Don't create multiple connection pools
- ❌ Don't keep connections open indefinitely
- ❌ Don't skip SSL/TLS encryption
- ❌ Don't bypass RLS policies
- ❌ Don't log connection strings (contains password)

## Environment-Specific Configuration

### Local Development

Can use either direct or pooled connection:

```bash
# .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/legaside"
```

### Preview/Staging

Must use pooled connection:

```bash
# Cloudflare Pages environment variable
DATABASE_URL="postgresql://...@pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require"
```

### Production

Must use pooled connection with high security:

```bash
# Cloudflare Pages environment variable
DATABASE_URL="postgresql://...@pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require"
```

## Upgrading Supabase Plans

If you encounter connection limits:

| Plan | Direct Connections | Pooled Connections |
|------|-------------------|-------------------|
| Free | 60 | 200 |
| Pro | 200 | 2000 |
| Team | 400 | 6000 |

For most applications, the Free tier with connection pooling is sufficient.

## Additional Resources

- [Supabase Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PgBouncer Documentation](https://www.pgbouncer.org/usage.html)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Cloudflare Workers Database Connections](https://developers.cloudflare.com/workers/databases/)

## Checklist

Before deploying to Cloudflare Pages:

- [ ] Using connection pooler URL (`pooler.supabase.com`)
- [ ] Connection string includes `?pgbouncer=true`
- [ ] Connection string includes `&sslmode=require`
- [ ] RLS is enabled on all tables
- [ ] RLS policies check `app.tenant_id`
- [ ] Connection pool max size is 5-10
- [ ] Tested connection locally
- [ ] Environment variables set in Cloudflare
- [ ] No connection strings logged or committed to Git

