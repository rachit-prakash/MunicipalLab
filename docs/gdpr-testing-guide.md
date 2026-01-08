# GDPR Compliance Testing Guide

This guide walks you through testing all GDPR compliance features implemented in the `compliance/legal-requirements` branch. Most user-facing controls now live inside the app at `/settings` (timezone sync, export download, delete account).

## Prerequisites

- Development server running (`pnpm dev`)
- Database access (to verify audit logs)
- Browser with DevTools
- Authenticated session (for protected endpoints)

---

## 1. Cookie Consent Banner

### Test: Banner Display and Interaction

1. **Clear existing consent:**

   - Open DevTools → Application → Local Storage → Clear `cookie-consent`
   - Application → Cookies → Delete `cookie-consent` cookie
   - Refresh the page

2. **Verify banner appears:**

   - Fixed bottom banner should be visible
   - Should show "Accept" and "Decline" buttons

3. **Test Accept:**

   - Click "Accept"
   - Banner should disappear
   - Check Local Storage: `cookie-consent` = `"accepted"`
   - Check Cookies: `cookie-consent=accepted` (Path=/)
   - Refresh page → banner should NOT reappear

4. **Test Decline:**
   - Clear consent again (step 1)
   - Refresh page
   - Click "Decline"
   - Banner should disappear
   - Check Local Storage: `cookie-consent` = `"declined"`
   - Check Cookies: `cookie-consent=declined`

### Test: Demo API Consent Enforcement

1. **Without consent:**

   ```bash
   curl -X POST http://localhost:3000/api/demo/enable \
     -H "Content-Type: application/json"
   ```

   Expected: `{"error":"Cookie consent required"}` with status `403`

2. **With consent cookie:**

   ```bash
   curl -X POST http://localhost:3000/api/demo/enable \
     -H "Content-Type: application/json" \
     -H "Cookie: cookie-consent=accepted"
   ```

   Expected: `{"ok":true}` with status `200`

3. **Test decline blocks:**
   ```bash
   curl -X POST http://localhost:3000/api/demo/enable \
     -H "Content-Type: application/json" \
     -H "Cookie: cookie-consent=declined"
   ```
   Expected: `403` error

---

## 2. User Data Export API

### Test: Export Personal Data

1. **Get your session token:**

   - Sign in via browser
   - Open DevTools → Application → Cookies
   - Copy `next-auth.session-token` value (or `__Secure-next-auth.session-token`)

2. **Call export endpoint:**

   **Option A - Browser DevTools (Easiest):**

   ```javascript
   // Open browser console (F12) while logged in, then run:
   fetch("/api/user/export")
     .then((r) => r.json())
     .then((data) => console.log(JSON.stringify(data, null, 2)))
     .catch((err) => console.error(err));
   ```

   **Option B - curl (Windows cmd):**

   ```cmd
   curl -X GET "http://localhost:3000/api/user/export" -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE"
   ```

   Note: In Windows cmd, wrap the URL in quotes and put the header on the same line.

   **Option C - PowerShell:**

   ```powershell
   $token = "YOUR_TOKEN_HERE"
   curl.exe -X GET http://localhost:3000/api/user/export -H "Cookie: next-auth.session-token=$token"
   ```

3. **Verify response:**

   - Status: `200`
   - JSON structure:
     ```json
     {
       "exportedAt": "2024-...",
       "user": { "id": "...", "email": "...", ... },
       "gmail_account": { ... },
       "memberships": [ ... ],
       "audit_logs": [ ... ]
     }
     ```
   - Should ONLY include requester's data (no other users' threads/messages)

4. **Verify audit log:**
   ```sql
   SELECT * FROM audit_logs
   WHERE action = 'user.export'
   ORDER BY created_at DESC LIMIT 1;
   ```
   Should show the export action with request_id.

### Test: Unauthorized Access

```bash
curl -X GET http://localhost:3000/api/user/export
```

Expected: `{"error":"Unauthorized"}` with status `401`

---

## 3. Account Deletion API

⚠️ **WARNING:** This permanently deletes user data. Use a test account!

### Test: Delete Account

1. **Get session token** (same as export test)

2. **Call delete endpoint:**

   ```bash
   curl -X DELETE http://localhost:3000/api/user/delete \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE" \
     -v
   ```

3. **Verify response:**

   - Status: `204 No Content`
   - Response headers should include cleared session cookies:
     - `Set-Cookie: next-auth.session-token=; Max-Age=0`
     - `Set-Cookie: __Secure-next-auth.session-token=; Max-Age=0`

4. **Verify data deletion:**

   ```sql
   -- User should be gone
   SELECT * FROM users WHERE id = 'USER_ID_HERE';
   -- Should return 0 rows

   -- Related data should be cleaned up
   SELECT * FROM gmail_accounts WHERE user_id = 'USER_ID_HERE';
   SELECT * FROM memberships WHERE user_id = 'USER_ID_HERE';
   SELECT * FROM audit_logs WHERE actor_user_id = 'USER_ID_HERE';
   -- All should return 0 rows

   -- Threads assignee should be nulled
   SELECT * FROM threads WHERE assignee_id = 'USER_ID_HERE';
   -- Should return 0 rows (or assignee_id should be NULL)
   ```

5. **Verify audit logs:**

   ```sql
   SELECT * FROM audit_logs
   WHERE action IN ('user.delete.requested', 'user.delete.completed')
   ORDER BY created_at DESC LIMIT 2;
   ```

   Should show both `requested` and `completed` entries.

6. **Verify session invalidated:**
   - Try accessing any protected route with the same token
   - Should get `401 Unauthorized`

### Test: Unauthorized Access

```bash
curl -X DELETE http://localhost:3000/api/user/delete
```

Expected: `401 Unauthorized`

---

## 4. Security Headers

### Test: Verify Headers on All Routes

1. **Check any page response:**

   ```bash
   curl -I http://localhost:3000/
   ```

2. **Verify headers present:**

   - `Content-Security-Policy`: Should include strict directives
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: no-referrer`
   - `Permissions-Policy`: Should restrict camera, microphone, etc.

3. **Check API routes:**

   ```bash
   curl -I http://localhost:3000/api/gmail/inbox
   ```

   Same headers should be present.

4. **Browser DevTools:**
   - Open Network tab → Select any request → Headers tab
   - Response Headers section should show all security headers

---

## 5. Audit Logging

### Test: Verify Audit Logs for Sensitive Operations

1. **Test Assistant Chat:**

   ```bash
   curl -X POST http://localhost:3000/api/assistant/chat \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
     -d '{"messages":[{"role":"user","content":"test"}]}'
   ```

   Check audit log:

   ```sql
   SELECT action, target_type, request_id, payload
   FROM audit_logs
   WHERE action = 'assistant.chat'
   ORDER BY created_at DESC LIMIT 1;
   ```

2. **Test Gmail Inbox Read:**

   ```bash
   curl -X GET http://localhost:3000/api/gmail/inbox \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN"
   ```

   Check audit log:

   ```sql
   SELECT action, target_type, request_id, payload
   FROM audit_logs
   WHERE action = 'gmail.inbox.read'
   ORDER BY created_at DESC LIMIT 1;
   ```

3. **Test Gmail Thread Read:**

   ```bash
   curl -X GET http://localhost:3000/api/gmail/threads/THREAD_ID \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN"
   ```

   Check audit log:

   ```sql
   SELECT action, target_type, target_id, request_id
   FROM audit_logs
   WHERE action = 'gmail.thread.read'
   ORDER BY created_at DESC LIMIT 1;
   ```

4. **Verify Request ID:**
   - All audit entries should have `request_id` matching the `x-request-id` header
   - Check response headers for `x-request-id` and compare with audit log

### Test: Request ID Propagation

```bash
curl -v http://localhost:3000/api/gmail/inbox \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

- Response should include `x-request-id` header
- If you send a custom `x-request-id`, it should be preserved
- Audit log should use the same request_id

---

## Quick Test Checklist

- [ ] Cookie banner appears on first visit
- [ ] Accept/Decline sets both localStorage and cookie
- [ ] Banner doesn't reappear after consent
- [ ] Demo APIs return 403 without consent
- [ ] Demo APIs work with `cookie-consent=accepted`
- [ ] User export returns only personal data
- [ ] User export creates audit log entry
- [ ] Account deletion removes all user data
- [ ] Account deletion nulls thread assignees
- [ ] Account deletion invalidates session
- [ ] Account deletion creates audit logs (requested + completed)
- [ ] Security headers present on all routes
- [ ] CSP allows necessary resources
- [ ] Audit logs created for assistant chat
- [ ] Audit logs created for Gmail operations
- [ ] Request IDs match between headers and audit logs

---

## Troubleshooting

### Cookie consent not working

- Check browser console for errors
- Verify localStorage is enabled
- Check cookie settings (SameSite, Secure flags)

### Export/Delete returns 401

- Verify session token is valid
- Check NextAuth configuration
- Ensure `NEXTAUTH_SECRET` is set

### Audit logs missing

- Verify database connection
- Check `withTenant` is resolving tenant_id correctly
- Ensure user has a tenant_id in users or gmail_accounts table

### Security headers not appearing

- Verify `next.config.mjs` changes are saved
- Restart dev server after config changes
- Check for conflicting middleware

---

## Database Queries for Verification

```sql
-- Check all GDPR-related audit logs
SELECT action, actor_user_id, target_type, target_id, request_id, created_at
FROM audit_logs
WHERE action IN (
  'user.export',
  'user.delete.requested',
  'user.delete.completed',
  'assistant.chat',
  'gmail.inbox.read',
  'gmail.inbox.resolve',
  'gmail.message.read',
  'gmail.threads.list',
  'gmail.thread.read'
)
ORDER BY created_at DESC
LIMIT 50;

-- Verify user deletion cleanup
SELECT
  (SELECT COUNT(*) FROM users WHERE id = 'USER_ID') as users_count,
  (SELECT COUNT(*) FROM gmail_accounts WHERE user_id = 'USER_ID') as gmail_count,
  (SELECT COUNT(*) FROM memberships WHERE user_id = 'USER_ID') as memberships_count,
  (SELECT COUNT(*) FROM audit_logs WHERE actor_user_id = 'USER_ID') as audit_count;
```
