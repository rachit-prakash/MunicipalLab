# MunicipalLabs CRM Documentation

Welcome to the MunicipalLabs CRM documentation! This folder contains comprehensive guides for setting up, configuring, and troubleshooting the application.

## 📚 Documentation Index

### Getting Started

1. **[Setup Guide](./SETUP.md)** ⭐ **Start Here**
   - Quick start instructions
   - Prerequisites
   - Step-by-step setup process
   - Verification steps

2. **[Environment Variables](./ENVIRONMENT.md)**
   - Complete reference for all environment variables
   - Required vs optional variables
   - Security best practices
   - `.env.local` template

### Configuration Guides

3. **[Database Setup](./DATABASE_SETUP.md)**
   - PostgreSQL installation (local & hosted)
   - Database creation
   - Schema setup
   - Connection troubleshooting

4. **[OAuth Setup](./OAUTH_SETUP.md)**
   - Google Cloud Console configuration
   - Gmail API enablement
   - OAuth consent screen setup
   - Redirect URI configuration
   - Production deployment

### Reference

5. **[Database Schema](./SCHEMA.md)**
   - Complete schema documentation
   - Entity relationships
   - Table descriptions
   - Common queries
   - Multi-tenancy architecture

6. **[Troubleshooting](./TROUBLESHOOTING.md)**
   - Common errors and solutions
   - Database connection issues
   - OAuth problems
   - Performance issues
   - Diagnostic checklist

---

## 🚀 Quick Start Path

If you're setting up for the first time, follow this order:

1. Read: [Setup Guide](./SETUP.md)
2. Configure: [Environment Variables](./ENVIRONMENT.md)
3. Setup: [Database](./DATABASE_SETUP.md)
4. Configure: [OAuth](./OAUTH_SETUP.md)
5. If issues: [Troubleshooting](./TROUBLESHOOTING.md)

---

## 🔧 Common Scenarios

### "I'm setting up locally for the first time"
→ Follow [Setup Guide](./SETUP.md) completely

### "Google sign-in is failing"
→ Check [OAuth Setup](./OAUTH_SETUP.md) and [Troubleshooting](./TROUBLESHOOTING.md)

### "Database connection timeout"
→ See [Troubleshooting - Database Issues](./TROUBLESHOOTING.md#database-issues)

### "What environment variables do I need?"
→ See [Environment Variables](./ENVIRONMENT.md)

### "I need to understand the database"
→ Read [Database Schema](./SCHEMA.md)

### "Deploying to production"
→ See production sections in each guide

---

## 📋 Pre-flight Checklist

Before running the app, ensure you have:

- ✅ Node.js 18.17+ installed
- ✅ PostgreSQL running and accessible
- ✅ `.env.local` file created with all required variables
- ✅ Google Cloud project created
- ✅ Gmail API enabled
- ✅ OAuth credentials configured
- ✅ Database schema applied
- ✅ Initial tenant created

---

## ⚠️ Current Issue: "Google sign-in failed"

If you're seeing this error, the issue is **database connection**, not OAuth!

### The Problem

```
[next-auth][error][OAUTH_CALLBACK_HANDLER_ERROR]
Connection terminated due to connection timeout
```

### The Solution

1. **Verify PostgreSQL is running:**
   ```bash
   # Windows
   sc query postgresql-x64-15
   
   # Mac
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. **Check DATABASE_URL in `.env.local`:**
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/municipallabs_crm
   ```

3. **Test database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. **Restart dev server:**
   ```bash
   pnpm dev
   ```

**Full details:** [Troubleshooting Guide](./TROUBLESHOOTING.md#connection-terminated-due-to-connection-timeout)

---

## 🆘 Getting Help

### Steps to Diagnose Issues

1. **Check the logs:**
   - Browser console (F12)
   - Terminal (dev server output)

2. **Review the relevant guide:**
   - [Troubleshooting](./TROUBLESHOOTING.md) for common errors
   - [Environment Variables](./ENVIRONMENT.md) for config issues
   - [Database Setup](./DATABASE_SETUP.md) for database issues
   - [OAuth Setup](./OAUTH_SETUP.md) for Google sign-in issues

3. **Run the diagnostic checklist:**
   ```bash
   # From Troubleshooting guide
   cat .env.local  # Check environment variables
   psql $DATABASE_URL -c "SELECT 1"  # Test database
   node --version  # Check Node version (need 18.17+)
   ```

4. **Enable debug logging:**
   ```bash
   DEBUG=* pnpm dev
   ```

### Still Stuck?

- Double-check you followed each guide completely
- Ensure all prerequisites are met
- Try the troubleshooting guide's solutions
- Check for typos in environment variables

---

## 📖 Documentation Standards

These docs follow these principles:

- ✅ **Step-by-step instructions** for beginners
- ✅ **Clear examples** with actual values
- ✅ **Common issues** with solutions
- ✅ **Security warnings** where important
- ✅ **Cross-references** between guides
- ✅ **Copy-pasteable** commands and configs

---

## 🔒 Security Reminders

- ⚠️ **Never commit** `.env.local` to git
- ⚠️ **Never share** secrets via Slack/email
- ⚠️ **Use different** credentials for dev/staging/production
- ⚠️ **Rotate secrets** if exposed
- ⚠️ **Enable SSL** for production databases
- ⚠️ **Review OAuth scopes** periodically

---

## 🎯 Architecture Overview

The application is built with:

- **Frontend:** Next.js 16 (App Router) + React
- **Authentication:** NextAuth.js with Google OAuth
- **Database:** PostgreSQL (multi-tenant)
- **Email:** Gmail API (read-only)
- **Encryption:** AES-256-GCM for tokens and message bodies
- **Styling:** Tailwind CSS + shadcn/ui components

**Key Features:**
- Multi-tenant architecture with row-level security
- OAuth token management with automatic refresh
- Encrypted storage of sensitive data (tokens, message bodies)
- PII redaction for compliance
- Audit logging for accountability
- Role-based access control (RBAC)

---

## 📝 Contributing to Docs

When adding or updating documentation:

1. Keep language simple and beginner-friendly
2. Include practical examples
3. Add troubleshooting sections
4. Cross-reference related guides
5. Use consistent formatting (see existing docs)
6. Test all commands and configurations

---

## 📄 License

See [LICENSE](../LICENSE) in the project root.

---

## 🏁 Ready to Start?

Begin with the **[Setup Guide](./SETUP.md)** and you'll be up and running in no time! 🚀


