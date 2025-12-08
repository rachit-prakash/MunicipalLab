# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth for the MunicipalLabs CRM application.

## Prerequisites

- A Google account
- Google Cloud Platform access

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a new project** (or select existing)
   - Click the project dropdown at the top
   - Click "New Project"
   - Name: `MunicipalLabs CRM` (or your preferred name)
   - Click "Create"
   - Wait for the project to be created, then select it

## Step 2: Enable Gmail API

1. **Open API Library**
   - In the left sidebar, go to **APIs & Services** → **Library**
   - Or visit: https://console.cloud.google.com/apis/library

2. **Enable Gmail API**
   - Search for "Gmail API"
   - Click on it
   - Click **Enable**
   - Wait for it to be enabled (may take a few seconds)

## Step 3: Configure OAuth Consent Screen

1. **Open OAuth Consent Screen**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Or visit: https://console.cloud.google.com/apis/credentials/consent

2. **Choose User Type**
   - Select **External** (unless you have Google Workspace)
   - Click **Create**

3. **App Information**
   - **App name**: `MunicipalLabs CRM`
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload a logo
   - **Application home page**: `http://localhost:3000` (for development)
   - **Application privacy policy**: (Optional for development)
   - **Application terms of service**: (Optional for development)
   - **Authorized domains**: Leave empty for development
   - **Developer contact information**: Your email address
   - Click **Save and Continue**

4. **Scopes**
   - Click **Add or Remove Scopes**
   - The app will request these scopes dynamically:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/gmail.readonly`
   - You don't need to add them here
   - Click **Save and Continue**

5. **Test Users** (Important for development!)
   - Click **Add Users**
   - Add your Google email address
   - Add any other test users you need
   - Click **Add**
   - Click **Save and Continue**

6. **Summary**
   - Review your settings
   - Click **Back to Dashboard**

## Step 4: Create OAuth Client ID

1. **Open Credentials Page**
   - Go to **APIs & Services** → **Credentials**
   - Or visit: https://console.cloud.google.com/apis/credentials

2. **Create Credentials**
   - Click **+ CREATE CREDENTIALS** at the top
   - Select **OAuth client ID**

3. **Configure OAuth Client**
   - **Application type**: **Web application**
   - **Name**: `MunicipalLabs CRM - Local Development`

4. **Authorized JavaScript Origins**
   - Click **+ Add URI**
   - Add: `http://localhost:3000`

5. **Authorized Redirect URIs** ⚠️ **CRITICAL!**
   - Click **+ Add URI**
   - Add: `http://localhost:3000/api/auth/callback/google`
   - ⚠️ **Must be exact** - no trailing slash!
   - ⚠️ Use `http://` not `https://` for localhost

6. **Create**
   - Click **Create**
   - You'll see a popup with your credentials

7. **Copy Your Credentials**
   - **Client ID**: Something like `123456789-abc...xyz.apps.googleusercontent.com`
   - **Client Secret**: Something like `GOCSPX-abc123xyz...`
   - Click **Download JSON** (optional, for backup)
   - Click **OK**

## Step 5: Update Environment Variables

Add your credentials to `.env.local`:

```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789
```

**Important:**
- No quotes needed
- No extra spaces
- Keep these secret (never commit to git)

## Step 6: Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Start it again
pnpm dev
```

## Step 7: Test OAuth Flow

1. Open `http://localhost:3000`
2. Click "Sign in with Google"
3. You should see:
   - Google account selection
   - OAuth consent screen
   - Permission requests:
     - See your personal info
     - Read your email messages
4. Click **Continue** or **Allow**
5. You should be redirected to `/gmail` page

## Production Setup

When deploying to production:

### 1. Update Redirect URIs
- Add production redirect URI to Google Cloud Console:
  ```
  https://yourdomain.com/api/auth/callback/google
  ```

### 2. Update Authorized Origins
- Add:
  ```
  https://yourdomain.com
  ```

### 3. Update Environment Variables
- Set production `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Update `NEXTAUTH_URL=https://yourdomain.com`

### 4. Publish OAuth App (Optional)
- If you need more than 100 users
- Go to OAuth consent screen
- Click **Publish App**
- Submit for Google verification (may take several days)

## Common Issues & Solutions

### "redirect_uri_mismatch" Error

**Error:**
```
Error 400: redirect_uri_mismatch
```

**Solutions:**
1. ✅ Check the redirect URI in Google Cloud Console is **exactly**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
2. ✅ No trailing slash
3. ✅ Use `http://` not `https://` for localhost
4. ✅ Check `NEXTAUTH_URL` in `.env.local` matches: `http://localhost:3000`
5. ✅ Restart your dev server after changes

### "Access blocked: This app's request is invalid"

**Causes:**
- Gmail API not enabled
- You're not added as a test user

**Solutions:**
1. ✅ Enable Gmail API in Google Cloud Console
2. ✅ Add your email as a test user in OAuth consent screen
3. ✅ Wait a few minutes for changes to propagate

### "Client ID not found"

**Solutions:**
1. ✅ Copy the full Client ID (ends with `.apps.googleusercontent.com`)
2. ✅ Check for extra spaces in `.env.local`
3. ✅ Restart dev server after updating `.env.local`
4. ✅ Verify you're using the correct Google Cloud Project

### "invalid_client" Error

**Solutions:**
1. ✅ Check `GOOGLE_CLIENT_SECRET` is correct
2. ✅ Regenerate secret if needed (in Google Cloud Console)
3. ✅ Ensure no extra characters or spaces in `.env.local`

### OAuth Consent Screen Shows Warning

This is normal for development! Messages like:
- "Google hasn't verified this app"
- "This app is in testing mode"

**To bypass:**
- Click "Advanced"
- Click "Go to [App Name] (unsafe)"

**For production:**
- Submit your app for Google verification
- Or keep it in testing mode for internal use

## Scopes Requested

The application requests these Google OAuth scopes:

- `openid` - Basic authentication
- `email` - User's email address
- `profile` - User's name and picture
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail messages

These are defined in `lib/auth.ts`.

## Security Best Practices

1. ✅ **Never commit** `.env.local` to git
2. ✅ **Rotate secrets** if exposed
3. ✅ **Use different credentials** for development and production
4. ✅ **Enable Gmail API** only (don't enable unnecessary APIs)
5. ✅ **Review OAuth scopes** periodically
6. ✅ **Monitor** Google Cloud Console for unusual activity

## Next Steps

After OAuth setup:
1. [Run the application](./SETUP.md)
2. [Test the Gmail integration](./TESTING.md)
3. [Understand the authentication flow](./ARCHITECTURE.md)


