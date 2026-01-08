# MunicipalLabs CRM - Setup Guide

This guide will walk you through setting up the MunicipalLabs CRM application from scratch.

## Prerequisites

- **Node.js** 18.17+ (Node 20 LTS recommended)
- **PostgreSQL** 12+ (local or hosted)
- **Google Cloud Project** (for OAuth and Gmail API)
- **pnpm** (recommended) or npm

## Quick Start

### 1. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret

# Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/municipallabs_crm
```

**Generate NEXTAUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Set Up PostgreSQL Database

See [Database Setup Guide](./DATABASE_SETUP.md) for detailed instructions on:
- Creating the database
- Running the schema
- Setting up the initial tenant

### 4. Set Up Google OAuth

See [OAuth Setup Guide](./OAUTH_SETUP.md) for step-by-step instructions on:
- Creating a Google Cloud project
- Enabling Gmail API
- Configuring OAuth consent screen
- Creating OAuth credentials
- Setting up redirect URIs

### 5. Run the Development Server

```bash
pnpm dev
# or
npm run dev
```

The application will be available at `http://localhost:3000`

## Verification

1. Navigate to `http://localhost:3000`
2. Click "Sign in with Google"
3. You should see the Google OAuth consent screen
4. After granting permissions, you'll be redirected to the Gmail inbox

## Common Issues

See [Troubleshooting Guide](./TROUBLESHOOTING.md) for solutions to common problems.

## Next Steps

- [Database Schema](./SCHEMA.md) - Understanding the database structure
- [API Documentation](./API.md) - API endpoints and usage
- [Architecture Overview](./ARCHITECTURE.md) - How the application works


