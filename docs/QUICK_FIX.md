# Quick Fix: "Google sign-in failed"

**If you're seeing this error right now, here's the quick fix! 🚀**

## The Problem

```
Google sign-in failed. Check OAuth client, redirect URI, and environment variables.
```

**Real error in logs:**
```
[next-auth][error][OAUTH_CALLBACK_HANDLER_ERROR]
Connection terminated due to connection timeout
at pg-pool/index.js:45:11
```

## The Root Cause

✅ **Google OAuth is actually working!**  
❌ **Database connection is failing!**

When you sign in with Google successfully, the app tries to save your user info to PostgreSQL, but it can't connect to the database.

## The Fix (5 minutes)

### Step 1: Check if PostgreSQL is Running

**Windows:**
```bash
sc query postgresql-x64-15
```

If it says "STOPPED", start it:
```bash
# Run as Administrator
net start postgresql-x64-15
```

**macOS:**
```bash
brew services list | grep postgresql
```

If it's not running:
```bash
brew services start postgresql@15
```

**Linux:**
```bash
sudo systemctl status postgresql
```

If it's not running:
```bash
sudo systemctl start postgresql
```

### Step 2: Add DATABASE_URL to `.env.local`

Your `.env.local` file is **missing the database connection!**

**Open `.env.local` and add:**

```bash
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/municipallabs_crm
```

**Replace:**
- `postgres` - your PostgreSQL username (default is `postgres`)
- `your_password` - your PostgreSQL password (set during installation)
- `municipallabs_crm` - your database name

**Example:**
```bash
# Complete .env.local file should look like:
NEXTAUTH_SECRET=37V/EcDhrcM3Sb7aVXfgeIsKSYEbcxm/dsUK39H9J0U=
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz

DATABASE_URL=postgresql://postgres:password123@localhost:5432/municipallabs_crm
```

### Step 3: Create Database (if needed)

If the database doesn't exist yet:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE municipallabs_crm;

# Exit
\q
```

### Step 4: Test Connection

```bash
psql "postgresql://postgres:password@localhost:5432/municipallabs_crm" -c "SELECT 1"
```

If this works, you're good! ✅

### Step 5: Restart Dev Server

```bash
# Stop the server (Ctrl+C)
pnpm dev
```

### Step 6: Try Signing In Again

1. Go to `http://localhost:3000`
2. Click "Sign in with Google"
3. Should work now! 🎉

---

## Still Not Working?

### Error: "database does not exist"

**Create it:**
```bash
psql -U postgres -c "CREATE DATABASE municipallabs_crm;"
```

### Error: "password authentication failed"

**Check your password:**
- You set this when installing PostgreSQL
- Try: `postgres` or the password you set during installation
- Reset if needed (Google: "reset postgresql password windows/mac/linux")

### Error: "psql: command not found"

**PostgreSQL isn't installed!**

- **Windows:** `winget install PostgreSQL.PostgreSQL`
- **macOS:** `brew install postgresql@15`
- **Linux:** `sudo apt install postgresql`

Then follow [Database Setup Guide](./DATABASE_SETUP.md)

### Error: "could not connect to server"

**PostgreSQL isn't running!** See Step 1 above.

---

## Don't Have PostgreSQL Yet?

### Option 1: Install Locally (Recommended for Dev)

**Windows:**
```bash
winget install PostgreSQL.PostgreSQL
# Or download: https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql
sudo systemctl start postgresql
```

Then create the database:
```bash
psql -U postgres -c "CREATE DATABASE municipallabs_crm;"
```

**Full instructions:** [Database Setup Guide](./DATABASE_SETUP.md)

### Option 2: Use Hosted Database (Easiest!)

**Supabase (Free tier):**
1. Go to https://supabase.com
2. Create account → New project
3. Wait for database to provision (~2 minutes)
4. Go to Settings → Database
5. Copy "Connection string" (URI format)
6. Add to `.env.local`:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres
   ```

**Neon (Free tier, instant):**
1. Go to https://neon.tech
2. Sign up → Create project
3. Copy connection string
4. Add to `.env.local`

---

## Complete `.env.local` Template

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=37V/EcDhrcM3Sb7aVXfgeIsKSYEbcxm/dsUK39H9J0U=
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# Database Connection (⚠️ THIS WAS MISSING!)
DATABASE_URL=postgresql://postgres:password@localhost:5432/municipallabs_crm
```

---

## Verification Checklist

Before trying to sign in again:

- ✅ PostgreSQL is installed
- ✅ PostgreSQL is running (check with `pg_isready`)
- ✅ Database `municipallabs_crm` exists
- ✅ `DATABASE_URL` is in `.env.local`
- ✅ Connection string has correct username/password
- ✅ Dev server restarted after adding `DATABASE_URL`

---

## Next Steps After Sign-In Works

Once you can sign in successfully:

1. **Apply database schema** - Your database admin should have the schema
2. **Create initial tenant** - Contact your team lead
3. **Explore the app** - Try the Gmail inbox, threads, and dashboard
4. **Read the docs** - See [docs/README.md](./README.md) for full documentation

---

## Need More Help?

- **Database issues:** [Database Setup Guide](./DATABASE_SETUP.md)
- **OAuth issues:** [OAuth Setup Guide](./OAUTH_SETUP.md)
- **Other errors:** [Troubleshooting Guide](./TROUBLESHOOTING.md)
- **Environment variables:** [Environment Guide](./ENVIRONMENT.md)

---

**TL;DR:** Add `DATABASE_URL` to your `.env.local` file, make sure PostgreSQL is running, restart your dev server. That's it! 🚀


