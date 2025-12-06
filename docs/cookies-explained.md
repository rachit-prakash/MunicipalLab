# Cookies Explained: Simple Guide

## What Are Cookies?

Think of cookies like **small sticky notes** that websites leave in your browser. When you visit a website, it can write a small piece of information (like "this user prefers dark mode" or "user is logged in") and store it in your browser. The next time you visit that website, your browser sends those sticky notes back, so the website remembers things about you.

### Real-World Analogy

Imagine you go to a coffee shop:

- **Without cookies**: Every time you visit, the barista doesn't remember you. You have to tell them your name, your order, and pay every single time.
- **With cookies**: The barista remembers your name, your usual order, and that you're a regular customer. They can serve you faster because they remember you.

Cookies work the same way - they help websites remember you between visits.

---

## Types of Cookies

### 1. **Essential Cookies** (No Consent Needed)

These are **required** for the website to work. Like remembering you're logged in so you don't have to sign in every single page.

**Example**: Session cookies that keep you logged in.

### 2. **Non-Essential Cookies** (Need Consent)

These are **optional** and used for things like:

- Analytics (tracking how many people visit)
- Advertising (showing you relevant ads)
- Personalization (remembering your preferences)

**Example**: Cookies that track which pages you visit to improve the website.

---

## Cookies Used in This Application

Based on the code, here are the cookies your app uses:

### 1. **Session Cookie** (`next-auth.session-token` or `__Secure-next-auth.session-token`)

- **What it does**: Keeps you logged in after you sign in with Google
- **Why it's needed**: Without this, you'd have to sign in on every single page
- **Type**: Essential (but GDPR still requires transparency)
- **Lifetime**: Until you log out or it expires
- **Set by**: NextAuth (authentication library)

**How it works**:

```
1. You sign in with Google → NextAuth creates a session
2. NextAuth stores a token in a cookie
3. Every time you visit a page, your browser sends this cookie
4. The app checks the cookie → "Oh, this user is logged in!"
5. You stay logged in across pages
```

### 2. **Demo Mode Cookie** (`demo`)

- **What it does**: Remembers that you enabled "demo mode" (trying the app without connecting Gmail)
- **Why it's needed**: So the app knows to show fake demo data instead of trying to connect to Gmail
- **Type**: Non-essential (requires consent)
- **Lifetime**: 7 days
- **Set by**: `/api/demo/enable` route

**How it works**:

```
1. User clicks "Try demo" on sign-in page
2. App checks: "Do they have cookie consent?" → Yes
3. App sets demo=1 cookie
4. When user visits Gmail pages, app checks: "Is demo=1?" → Yes
5. App shows demo data instead of real Gmail data
```

### 3. **Cookie Consent Cookie** (`cookie-consent`)

- **What it does**: Remembers whether you accepted or declined non-essential cookies
- **Why it's needed**: GDPR law requires we remember your choice so we don't ask you every time
- **Type**: Essential (needed for compliance)
- **Lifetime**: 1 year
- **Set by**: Cookie consent banner component

**How it works**:

```
1. User sees cookie banner
2. User clicks "Accept" or "Decline"
3. App saves choice: cookie-consent=accepted or cookie-consent=declined
4. Next time user visits, app checks this cookie
5. If choice exists, don't show banner again
```

---

## Why GDPR Requires Consent

**GDPR** (General Data Protection Regulation) is a European law that protects people's privacy. It says:

> "Before you store information about someone (like cookies), you must ask their permission first."

### The Rules:

1. **Essential cookies** (like login sessions) are usually okay, but you still need to tell users about them
2. **Non-essential cookies** (like analytics, ads) **require explicit consent** before you can use them
3. Users must be able to **decline** non-essential cookies
4. You must **remember their choice** so you don't ask repeatedly

### What Happens If You Don't Comply?

- Fines up to €20 million or 4% of annual revenue (whichever is higher)
- Legal trouble
- Users can't trust your app

---

## How Cookies Work Technically

### Setting a Cookie

When the server wants to set a cookie, it sends this in the HTTP response:

```
Set-Cookie: demo=1; Path=/; Max-Age=604800; SameSite=Lax; HttpOnly
```

This tells the browser:

- **Name**: `demo`
- **Value**: `1`
- **Path**: `/` (available on all pages)
- **Max-Age**: `604800` seconds (7 days)
- **SameSite**: `Lax` (only sent on same-site requests)
- **HttpOnly**: Can't be accessed by JavaScript (more secure)

### Reading a Cookie

When your browser makes a request, it automatically sends all cookies:

```
Cookie: demo=1; cookie-consent=accepted; next-auth.session-token=abc123...
```

The server reads these cookies to know:

- User has demo mode enabled
- User accepted cookies
- User is logged in (session token)

---

## Cookie Security Features

### 1. **HttpOnly**

- Prevents JavaScript from reading the cookie
- Protects against XSS attacks (malicious scripts stealing cookies)
- Example: Session cookies are HttpOnly so hackers can't steal your login

### 2. **Secure**

- Cookie only sent over HTTPS (encrypted connection)
- Prevents hackers from intercepting cookies on public WiFi
- Example: `Secure` flag ensures cookies only work on secure connections

### 3. **SameSite**

- Controls when cookies are sent to other websites
- `Lax`: Sent on same-site requests (normal browsing)
- `Strict`: Never sent to other sites (maximum security)
- Prevents CSRF attacks (other sites pretending to be you)

### 4. **Path**

- Limits which pages can access the cookie
- `/` = all pages
- `/api` = only API routes
- Reduces risk if one page is compromised

---

## In Your Application's Code

### Where Cookies Are Set:

```typescript
// Demo mode cookie (requires consent)
res.cookies.set({
  name: "demo",
  value: "1",
  path: "/",
  httpOnly: true, // JavaScript can't read it
  sameSite: "lax", // Security protection
  maxAge: 60 * 60 * 24 * 7, // 7 days
});

// Cookie consent preference
document.cookie =
  "cookie-consent=accepted; Path=/; Max-Age=31536000; SameSite=Lax";
```

### Where Cookies Are Read:

```typescript
// Check if user has consent
const consent = req.cookies.get("cookie-consent")?.value;
if (consent !== "accepted") {
  return 403; // Block access
}

// Check if demo mode is enabled
const isDemo = req.cookies.get("demo")?.value === "1";
```

### NextAuth Session Cookies:

NextAuth automatically sets these when you log in:

- `next-auth.session-token` (regular)
- `__Secure-next-auth.session-token` (HTTPS only)

These contain encrypted information about your session (user ID, expiration time, etc.)

---

## Summary

**Cookies are small pieces of data** that websites store in your browser to remember things about you.

**In this app, cookies are used for**:

1. ✅ Keeping you logged in (session cookie)
2. ✅ Enabling demo mode (demo cookie)
3. ✅ Remembering your cookie consent choice (cookie-consent cookie)

**GDPR requires**:

- ✅ Ask permission before setting non-essential cookies
- ✅ Let users decline
- ✅ Remember their choice
- ✅ Only set cookies after consent (for non-essential ones)

**Security features**:

- 🔒 HttpOnly (JavaScript can't steal them)
- 🔒 Secure (only over HTTPS)
- 🔒 SameSite (prevents cross-site attacks)
- 🔒 Path restrictions (limit where they work)

---

## Common Questions

**Q: Can I delete cookies?**
A: Yes! In your browser settings, you can delete cookies. You'll just need to log in again.

**Q: Are cookies dangerous?**
A: Cookies themselves aren't dangerous, but malicious websites can use them to track you. That's why GDPR exists - to protect your privacy.

**Q: Why do I need to accept cookies?**
A: GDPR law requires websites to ask permission before storing non-essential information about you. It's to protect your privacy.

**Q: What if I decline cookies?**
A: Essential features (like logging in) still work. Non-essential features (like demo mode) won't work until you accept.

**Q: Do cookies store my password?**
A: No! Passwords are never stored in cookies. Cookies only store tokens that prove you're logged in (like a temporary ID card).
