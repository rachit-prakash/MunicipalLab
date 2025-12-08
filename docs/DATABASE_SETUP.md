# Database Setup Guide

This guide covers setting up PostgreSQL for the MunicipalLabs CRM application.

## Option 1: Local PostgreSQL (Recommended for Development)

### Install PostgreSQL

**Windows:**
```bash
# Using winget
winget install PostgreSQL.PostgreSQL

# Or download from https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Create Database

1. **Connect to PostgreSQL:**
```bash
# Windows
psql -U postgres

# macOS/Linux
sudo -u postgres psql
```

2. **Create database and user:**
```sql
-- Create database
CREATE DATABASE municipallabs_crm;

-- Create user (replace with your own password)
CREATE USER crm_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE municipallabs_crm TO crm_user;

-- Connect to the database
\c municipallabs_crm

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_user;

-- Exit
\q
```

3. **Update your `.env.local`:**
```bash
DATABASE_URL=postgresql://crm_user:your_secure_password@localhost:5432/municipallabs_crm
```

### Run Database Schema

The database uses the following tables:
- `tenants` - Multi-tenancy support
- `users` - Application users
- `gmail_accounts` - Gmail account connections
- `threads` - Email thread metadata
- `messages` - Individual email messages
- `topics` - Topic classification
- `roles` - User roles
- `memberships` - User-role associations
- `audit_logs` - Audit trail

**Apply the schema:**

Your database admin should have already created these tables. If not, contact your database administrator to run the schema provided in your database migration system.

### Create Initial Tenant

After the schema is set up, create an initial tenant:

```sql
INSERT INTO tenants (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant')
ON CONFLICT DO NOTHING;

INSERT INTO roles (id, rank) VALUES
  ('admin', 1),
  ('manager', 2),
  ('agent', 3)
ON CONFLICT DO NOTHING;
```

## Option 2: Hosted PostgreSQL (Production)

### Recommended Providers

1. **Supabase** (Free tier available)
   - Visit https://supabase.com
   - Create new project
   - Copy connection string from Settings → Database
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`

2. **Neon** (Serverless, free tier)
   - Visit https://neon.tech
   - Create new project
   - Copy connection string

3. **Railway** (Simple deployment)
   - Visit https://railway.app
   - Create new PostgreSQL database
   - Copy connection string

4. **AWS RDS** or **Google Cloud SQL** (Enterprise)
   - Follow provider documentation
   - Ensure security groups/firewall allow connections

### Configure Hosted Database

1. Copy the connection string from your provider
2. Update `.env.local`:
```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

3. Run migrations (if your provider doesn't auto-apply)

## Verify Connection

Test your database connection:

```bash
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()', (err, res) => { if (err) console.error('❌ Connection failed:', err); else console.log('✅ Connected! Server time:', res.rows[0].now); pool.end(); });"
```

## Connection Pooling

The application uses connection pooling with these settings:
- **Max connections**: 10
- **Idle timeout**: 30 seconds
- **Connection timeout**: 10 seconds

These are configured in `lib/db.ts`.

## Multi-Tenancy

The application uses PostgreSQL row-level security with the `app.tenant_id` session variable. Each tenant has isolated data enforced at the database level.

When a user signs in, the application:
1. Determines their tenant (from email domain or gmail_accounts table)
2. Creates a transaction with `SET LOCAL app.tenant_id = 'tenant-uuid'`
3. All queries within that transaction only access that tenant's data

## Troubleshooting

### Connection Timeout Error

```
Error: Connection terminated due to connection timeout
```

**Solutions:**
- Verify DATABASE_URL is set correctly in `.env.local`
- Check PostgreSQL is running: `pg_isready`
- Test connection with psql: `psql $DATABASE_URL`
- Verify firewall/security groups allow connections
- Check if using SSL when required: add `?sslmode=require` to connection string

### Permission Denied

```
Error: permission denied for table users
```

**Solution:**
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_user;
```

### Database Does Not Exist

```
Error: database "municipallabs_crm" does not exist
```

**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE municipallabs_crm;"
```

## Next Steps

After database setup is complete:
1. [Set up Google OAuth](./OAUTH_SETUP.md)
2. [Run the application](./SETUP.md)
3. [Understand the schema](./SCHEMA.md)


