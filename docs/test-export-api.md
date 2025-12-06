# Quick Test: User Export API

## Easiest Method: Browser DevTools

1. **Sign in** to your app at `http://localhost:3000`
2. **Open DevTools** (Press `F12`)
3. **Go to Console tab**
4. **Paste and run:**

```javascript
fetch('/api/user/export')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Success!');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });
```

This automatically uses your browser's session cookie - no need to copy/paste tokens!

---

## PowerShell Method (If You Must Use curl)

The issue is PowerShell's quote handling with long tokens. Try this:

```powershell
# Get your token from browser DevTools → Application → Cookies
$token = "YOUR_TOKEN_HERE"

# Use Invoke-WebRequest (PowerShell native, more reliable)
$headers = @{
    "Cookie" = "next-auth.session-token=$token"
}
Invoke-WebRequest -Uri "http://localhost:3000/api/user/export" -Headers $headers | Select-Object -ExpandProperty Content
```

Or if you really want curl.exe:

```powershell
$token = "YOUR_TOKEN_HERE"
$cookieHeader = "Cookie: next-auth.session-token=$token"
& curl.exe -X GET "http://localhost:3000/api/user/export" -H $cookieHeader
```

---

## Troubleshooting

**Connection timeout?**
- Make sure dev server is running: `pnpm dev`
- Check if port 3000 is in use: `netstat -ano | findstr :3000`

**401 Unauthorized?**
- Your session token might be expired - sign in again
- Make sure you copied the ENTIRE token (they're very long)

**Still not working?**
- Use the browser DevTools method - it's the most reliable! 🎯

