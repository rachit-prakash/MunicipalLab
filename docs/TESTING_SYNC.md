# Testing Gmail Sync

Quick guide to test your new sync functionality!

## ✅ Pre-requisites

Make sure you have:
1. Signed in with Google OAuth at least once
2. Your Gmail account connected to the CRM
3. Dev server running (`pnpm dev`)

## 🧪 Test 1: Auto-sync on dashboard load

1. **Start your dev server:**
   ```bash
   pnpm dev
   ```

2. **Sign in and load `/dashboard`:**
   - Watch the Network tab: you should see a `POST /api/sync` request fire immediately.
   - Within a few seconds the insights will refresh using real Gmail data.

3. **Verify counts:**
   - "NEW MESSAGES TODAY" should reflect actual messages since midnight (local timezone).
   - "Total emails" and other cards should update as soon as the sync finishes.

## 🧪 Test 2: Manual "Sync Now" button

1. **Start your dev server:**
   ```bash
   pnpm dev
   ```

2. **Open the Policy Intelligence page:**
   - Navigate to the page with the Policy Intelligence dashboard
   - You should see a blue "Sync Now" button in the top right

3. **Click "Sync Now":**
   - Button should show a spinning icon and say "Syncing..."
   - After a few seconds, you should see "✓ Synced successfully!"
   - The email counts should update with your actual Gmail emails

4. **Verify the data:**
   - "NEW MESSAGES TODAY" should now show your actual count (not 0!)
   - Other metrics should update based on your real emails

## 🧪 Test 3: API Endpoint Directly

You can also test the sync API directly:

```bash
# Make sure you're logged in first, then:
curl http://localhost:3000/api/sync -X POST -H "Cookie: your-session-cookie"
```

Or just visit in your browser (while logged in):
```
http://localhost:3000/api/sync
```

You should see:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "timestamp": "2025-11-26T..."
}
```

## 🐛 Common Issues

### Issue: "No Gmail account found"
**Solution:** Make sure you've signed in with Google OAuth at least once.

### Issue: Button clicks but nothing happens
**Solution:** 
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab to see if `/api/sync` request succeeded

### Issue: Sync succeeds but counts still show 0
**Solution:** 
1. Check if emails exist in database:
   ```sql
   SELECT COUNT(*) FROM messages WHERE is_outbound = false;
   ```
2. If count is 0, check Gmail API permissions
3. Try signing out and back in to refresh OAuth tokens

## ✨ What Success Looks Like

After a successful sync:
1. ✅ "Sync Now" button shows success message
2. ✅ Email counts on dashboard update to real numbers
3. ✅ "NEW MESSAGES TODAY" shows your actual Gmail emails from today
4. ✅ Database has messages in `messages` table
5. ✅ `gmail_accounts.last_sync_at` is updated

## 📊 Verify Database Changes

Check what was synced:

```sql
-- See all synced messages
SELECT id, from_email, snippet, internal_date 
FROM messages 
ORDER BY internal_date DESC 
LIMIT 10;

-- Check sync status
SELECT email, last_sync_at, history_id 
FROM gmail_accounts;

-- Count messages by date
SELECT DATE(internal_date) as date, COUNT(*) 
FROM messages 
WHERE is_outbound = false 
GROUP BY DATE(internal_date) 
ORDER BY date DESC;
```

## 🎉 Next Steps

Once testing is successful:
1. ✅ Manual sync is working
2. ✅ Auto-sync on page load is confirmed
3. 🚀 Ship it!

