# Analytics Setup Guide

Your app now has analytics support that respects cookie consent! Analytics only load when users **accept cookies**.

## Quick Start

1. Open [`components/analytics.tsx`](../components/analytics.tsx)
2. Choose your analytics provider
3. Update the configuration
4. Deploy!

---

## Provider Comparison

| Provider | Privacy | Price | Features | Recommendation |
|----------|---------|-------|----------|----------------|
| **Plausible** | ⭐⭐⭐⭐⭐ | $9/mo | Pageviews, goals, referrers | **Best for government/legislative** |
| **Fathom** | ⭐⭐⭐⭐⭐ | $14/mo | Similar to Plausible | Great alternative |
| **PostHog** | ⭐⭐⭐⭐ | Free tier | Product analytics, feature flags | Best for product teams |
| **Umami** | ⭐⭐⭐⭐⭐ | Free (self-host) | Basic analytics | Budget option |
| **Google Analytics** | ⭐⭐ | Free | Most features | Not recommended for privacy |

---

## 1. Plausible Analytics (Recommended)

### Why Plausible?
- ✅ No cookies needed (but still respects your consent banner)
- ✅ GDPR compliant by default
- ✅ Lightweight (<1KB vs Google's 45KB)
- ✅ Simple, clean interface
- ✅ Perfect for government/legislative use

### Setup

1. **Sign up at [plausible.io](https://plausible.io)**

2. **Add your domain**: `legaside.com`

3. **Update `components/analytics.tsx`**:
   ```typescript
   const ANALYTICS_CONFIG: AnalyticsConfig = {
     provider: "plausible",
     plausible: {
       domain: "legaside.com", // Your domain
     },
   }
   ```

4. **Deploy and verify**:
   - Visit your site
   - Accept cookies
   - Check Plausible dashboard (data appears within ~10 seconds)

### Custom Events (Optional)

Track button clicks, form submissions, etc.:

```typescript
// In any client component
declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void
  }
}

// Track custom event
window.plausible?.("Button Click", {
  props: { button: "Sign Up" }
})
```

---

## 2. Fathom Analytics

Very similar to Plausible, just a different company.

1. **Sign up at [usefathom.com](https://usefathom.com)**
2. **Get your Site ID** from dashboard
3. **Update config**:
   ```typescript
   const ANALYTICS_CONFIG: AnalyticsConfig = {
     provider: "fathom",
     fathom: {
       siteId: "ABCDEFGH", // From Fathom dashboard
     },
   }
   ```

---

## 3. PostHog (Product Analytics)

Best if you need more than just pageviews (session replay, feature flags, etc.)

1. **Sign up at [posthog.com](https://posthog.com)**
2. **Get your Project API Key**
3. **Update config**:
   ```typescript
   const ANALYTICS_CONFIG: AnalyticsConfig = {
     provider: "posthog",
     posthog: {
       apiKey: "phc_xxxxxxxxxxxxx", // From PostHog project settings
       apiHost: "https://app.posthog.com",
     },
   }
   ```

### PostHog Features

```typescript
// Track events
posthog.capture("Button Clicked", { button_name: "signup" })

// Identify users (after login)
posthog.identify(user.id, {
  email: user.email,
  name: user.name,
})

// Feature flags
if (posthog.isFeatureEnabled("new-dashboard")) {
  // Show new dashboard
}
```

---

## 4. Self-Hosted Umami (Free)

Perfect if you want full control and zero costs.

### Setup on Vercel (Free Hosting)

1. **Fork [umami repo](https://github.com/umami-software/umami)**
2. **Deploy to Vercel**: Click "Deploy" button in README
3. **Add PostgreSQL database** (Vercel Postgres or Supabase)
4. **Get your tracking code** from Umami dashboard
5. **Create a custom provider** in `components/analytics.tsx`:

```typescript
{/* Umami */}
{ANALYTICS_CONFIG.provider === "umami" && (
  <Script
    async
    src="https://your-umami.vercel.app/script.js"
    data-website-id="your-website-id"
  />
)}
```

---

## 5. Google Analytics 4 (Not Recommended)

Only use if you absolutely need Google's features.

1. **Create GA4 property** at [analytics.google.com](https://analytics.google.com)
2. **Get Measurement ID** (looks like `G-XXXXXXXXXX`)
3. **Update config**:
   ```typescript
   const ANALYTICS_CONFIG: AnalyticsConfig = {
     provider: "google",
     google: {
       measurementId: "G-XXXXXXXXXX",
     },
   }
   ```

**Note**: Google Analytics has more privacy concerns and requires careful GDPR handling.

---

## Testing Your Setup

### 1. Check Analytics Load

1. Open DevTools → Network tab
2. Visit your site
3. **Don't accept cookies yet** → No analytics script should load
4. **Accept cookies** → Analytics script should load
5. Check Network tab for analytics requests

### 2. Verify Data

**Plausible/Fathom**: Check dashboard (appears within 10-60 seconds)

**PostHog**: Check dashboard → Live Events

**Google Analytics**: Real-time reports

### 3. Test Cookie Consent

```bash
# Terminal test
# Without consent (should fail or not track)
curl -X POST http://localhost:3000/your-page

# With consent (should work)
curl -X POST http://localhost:3000/your-page \
  -H "Cookie: cookie-consent=accepted"
```

---

## Environment Variables (Optional)

For security, you can move config to environment variables:

```env
# .env.local
NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=legaside.com
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
```

Then update [`components/analytics.tsx`](../components/analytics.tsx):

```typescript
const ANALYTICS_CONFIG: AnalyticsConfig = {
  provider: (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER as AnalyticsProvider) || "none",
  plausible: {
    domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "",
  },
  // ... etc
}
```

---

## Privacy Compliance Checklist

✅ **Cookie consent implemented** (already done!)
✅ **Analytics only load after consent** (already done!)
✅ **IP anonymization enabled** (Plausible/Fathom do this by default)
✅ **Data processing agreement** (sign with your analytics provider)
✅ **Privacy policy updated** (mention analytics in your privacy policy)
✅ **Data retention policy** (configure in analytics dashboard)

---

## Recommended: Plausible for Legaside

For your legislative/government use case, I strongly recommend **Plausible**:

1. **Privacy-first**: No personal data collected
2. **Transparent**: EU-owned, open source
3. **Fast**: Doesn't slow down your site
4. **Simple**: Easy to understand metrics
5. **Trustworthy**: Good for government/public sector

### Setup (5 minutes)

```bash
# 1. Sign up
open https://plausible.io/register

# 2. Add domain: legaside.com

# 3. Update config
# In components/analytics.tsx:
provider: "plausible"
domain: "legaside.com"

# 4. Deploy
git add .
git commit -m "Add Plausible analytics"
git push

# 5. Test
# Accept cookies on your site
# Check Plausible dashboard in ~30 seconds
```

That's it! You're done. 🎉

---

## Need Help?

- **Plausible docs**: [plausible.io/docs](https://plausible.io/docs)
- **PostHog docs**: [posthog.com/docs](https://posthog.com/docs)
- **Fathom docs**: [usefathom.com/docs](https://usefathom.com/docs)

## Current Status

✅ Analytics component created
✅ Added to layout
✅ Respects cookie consent
⏳ **Next step**: Choose provider and configure
