# Gmail Sync Guide (Manual-Only)

Manual sync keeps things simple: every time a user opens, refreshes, or logs back into the dashboard we automatically pull fresh Gmail data just for that user. No cron jobs, no background schedulers—just an on-demand sync tied to real user activity.

---

## How It Works

1. **Auto-trigger on page load**  
   When the dashboard mounts (or when the user refreshes/signs in), the UI immediately calls `POST /api/sync`. This ensures the inbox is brought up to date before insights render.

2. **"Sync Now" button**  
   Users can still press the blue **Sync Now** button in the Policy Intelligence header to re-run the sync whenever they want more control. The button shows status feedback (spinners, success/fail).

3. **Insights reload automatically**  
   After a successful sync, the dashboard re-fetches `/api/policy-intelligence`, so the cards always reflect the most recent Gmail state.

There is intentionally **no** background cron. All syncing is user-triggered so we stay within Gmail quotas and Vercel’s cron limits, and the UX is always predictable.

---

## When Sync Runs

| Action | What happens |
|--------|--------------|
| User visits `/dashboard` | `POST /api/sync` runs immediately, then insights load |
| User refreshes page | Same as above |
| User signs back in | First dashboard load triggers sync |
| User clicks "Sync Now" | Immediate manual sync + insights refresh |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sync` | POST (preferred) / GET | Runs a per-user Gmail sync |
| `/api/policy-intelligence` | GET | Returns the dashboard metrics after sync |

> Tip: The UI uses `POST /api/sync`, but `GET` is available for quick tests in the browser.

---

## Developer Notes

- **Bootstrap vs Incremental:**  
  The first sync pulls the latest ~10 messages and stores Gmail’s `historyId`. Subsequent syncs use Gmail History API deltas for efficiency.

- **Idempotent writes:**  
  Messages are upserted by `gmail_message_id`, so running sync repeatedly is safe.

- **Token handling:**  
  Access tokens are refreshed automatically via the stored Google refresh token. Make sure OAuth credentials and encrypted refresh tokens exist for the user.

- **Error handling:**  
  - History gaps (Gmail `410` errors) automatically trigger a bootstrap reset.  
  - Missing/deleted individual messages (Gmail `404`) are skipped with a warning so the rest of the batch still succeeds.

---

## Troubleshooting

- **"No Gmail account found":** The user hasn’t connected Gmail yet. Prompt them to sign in with Google and ensure they exist in `gmail_accounts`.
- **Sync succeeds but cards stay zero:** Check the `messages` table directly. If empty, verify Gmail API scope `https://www.googleapis.com/auth/gmail.readonly` and that the inbox actually has new mail for today.
- **OAuth errors:** Sign out/in to refresh credentials; confirm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and encryption keys are configured.

---

## Verifying Sync

Run these queries to confirm data is flowing:

```sql
-- Most recent messages
SELECT from_email, subject, internal_date
FROM messages
WHERE tenant_id = '<tenant>'
ORDER BY internal_date DESC
LIMIT 10;

-- Last sync timestamp
SELECT email, last_sync_at
FROM gmail_accounts
ORDER BY last_sync_at DESC;
```

---

## Next Steps

1. ✅ Ensure Google OAuth is set up so users can connect Gmail.
2. ✅ Visit the dashboard (or click **Sync Now**) to populate data.
3. ✅ Monitor `gmail_accounts.last_sync_at` to confirm syncs are running whenever users engage.

Enjoy the streamlined manual sync flow! 🎉

