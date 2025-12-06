# Google OAuth Configuration for Production

## Overview
This document explains how to configure Google OAuth for your Cloudflare Pages deployment.

## Required Redirect URIs

You need to add the following redirect URIs to your Google Cloud Console OAuth application:

### Production
```
https://legaside.municipallabs.ai/api/auth/callback/google
```

### Preview/Staging
```
https://devlegaside.municipallabs.ai/api/auth/callback/google
```

### Local Development (optional)
```
http://localhost:3000/api/auth/callback/google
```

## Setup Steps

### 1. Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**

### 2. Configure OAuth Consent Screen (if not already done)
1. Click on **OAuth consent screen** in the left sidebar
2. Choose **External** user type
3. Fill in the required information:
   - App name: `Legaside` (or your preferred name)
   - User support email: Your email
   - Developer contact email: Your email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
5. Add test users if your app is still in testing mode

### 3. Update OAuth 2.0 Client
1. Find your existing OAuth 2.0 Client ID (or create new one)
2. Click the pencil icon to edit
3. Under **Authorized redirect URIs**, add the production and preview URLs listed above
4. Click **Save**

### 4. Environment Variables

Make sure you have these environment variables set in Cloudflare Pages:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

**Note:** If you want separate OAuth apps for development and production (recommended for better security), create two separate OAuth clients and use different credentials for each environment.

## Security Best Practices

### For Production OAuth App:
- ✅ Only include `https://` URLs (no `http://`)
- ✅ Only include your production domains
- ✅ Remove localhost URLs
- ✅ Use a separate OAuth client from development
- ✅ Regularly review authorized redirect URIs

### For Development OAuth App:
- ✅ Can include localhost for local testing
- ✅ Can include preview/staging URLs
- ✅ Keep separate from production credentials

## Testing

After configuration, test the authentication flow:

1. **Local testing:** Run `pnpm dev` and sign in at `http://localhost:3000`
2. **Preview testing:** Deploy to preview branch and test at `https://devlegaside.municipallabs.ai`
3. **Production testing:** Deploy to production and test at `https://legaside.municipallabs.ai`

## Troubleshooting

### "redirect_uri_mismatch" error
- Double-check that the redirect URI in Google Cloud Console exactly matches the URL being used
- Make sure there are no trailing slashes
- Ensure the protocol (http vs https) matches

### "Access blocked: This app's request is invalid"
- Verify your OAuth consent screen is configured
- Check that all required scopes are added
- Ensure the user is added as a test user (if app is in testing mode)

### Gmail API not working
- Verify the Gmail API is enabled in Google Cloud Console
- Check that the `gmail.readonly` scope is included in the OAuth consent screen
- Ensure refresh tokens are being stored correctly (check database)

## Moving to Production

Before going live:
1. Submit your app for verification in the OAuth consent screen
2. This is required if you have more than 100 users
3. Google will review your app's use of sensitive scopes (like Gmail access)
4. The verification process can take several weeks

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Scopes](https://developers.google.com/gmail/api/auth/scopes)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)

