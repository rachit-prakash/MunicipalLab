# Automatic Gmail Sync Setup

## Changes Made

### 1. Fixed "Unknown Sender" Issue ✅
- Updated `app/api/gmail/threads/[id]/route.ts` to include `sender_email` when creating threads
- Backfilled 251 threads with missing `sender_email` data
- All threads now properly display sender information

### 2. Fixed Your Own Emails Showing Up ✅
- Updated `app/api/gmail/threads/route.ts` to exclude outbound emails (sent by you)
- Your sent emails will no longer appear in the inbox
- Constituent profiles will only show for emails FROM other people TO you

### 3. Automatic Syncing with Vercel Cron ✅
Created three new files:
- `app/api/cron/sync/route.ts` - Cron endpoint that syncs all Gmail accounts
- `lib/sync.ts` - Wrapper for sync functionality
- `vercel.json` - Cron schedule configuration (runs every 15 minutes)

## Setup Instructions

### Step 1: Add CRON_SECRET Environment Variable

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: Generate a secure random string (e.g., `openssl rand -base64 32`)
   - **Environments**: Production, Preview, Development

Example:
```bash
# Generate a secure secret
openssl rand -base64 32
# Output: 8xK9mP2vQ7wN3fR5tY1uZ6bA4cD8eF0gH2iJ4kL6mN8o=
```

### Step 2: Add to Local Environment

Add to your `.env.local`:
```env
CRON_SECRET=your-generated-secret-here
```

### Step 3: Deploy to Vercel

```bash
git add .
git commit -m "feat: automatic Gmail sync with Vercel Cron"
git push
```

Vercel will automatically detect the `vercel.json` cron configuration and set up the scheduled job.

### Step 4: Verify Cron is Running

After deployment:
1. Go to Vercel Dashboard → **Deployments** → Click on your latest deployment
2. Navigate to **Cron Jobs** tab
3. You should see: `/api/cron/sync` scheduled for `*/15 * * * *` (every 15 minutes)
4. Check **Logs** to see sync activity

## How It Works

### Sync Schedule
- **Frequency**: Every 15 minutes
- **Endpoint**: `GET /api/cron/sync`
- **Authentication**: Bearer token using `CRON_SECRET`

### What Gets Synced
1. Finds all Gmail accounts with valid `refresh_token`
2. Calls `runIncrementalSync()` for each account
3. Fetches new emails from Gmail API
4. Upserts threads and messages to database
5. Updates `last_sync_at` timestamp

### Sync Order
Accounts are synced in order of:
1. Never synced (`last_sync_at IS NULL`)
2. Least recently synced

## Manual Testing

You can manually trigger a sync (for testing):

```bash
curl -X GET https://your-app.vercel.app/api/cron/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "total": 1,
  "synced": 1,
  "failed": 0,
  "errors": [],
  "timestamp": "2025-12-05T12:00:00.000Z"
}
```

## Monitoring

### Check Sync Status
```sql
SELECT
  email,
  last_sync_at,
  NOW() - last_sync_at as time_since_sync
FROM gmail_accounts
ORDER BY last_sync_at DESC;
```

### View Recent Threads
```sql
SELECT
  subject,
  sender_email,
  last_message_ts,
  created_at
FROM threads
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Cron Not Running
- Verify `CRON_SECRET` is set in Vercel environment variables
- Check Vercel Dashboard → Cron Jobs tab for errors
- Ensure `vercel.json` is in the root directory

### Sync Failing
- Check Vercel logs for error messages
- Verify Gmail OAuth tokens are not expired
- Ensure database connection is working

### No New Emails Appearing
- Check that `last_sync_at` is updating (proves cron is running)
- Verify Gmail API quotas haven't been exceeded
- Check that threads are not being filtered by "Important" view

## Cost Considerations

- **Vercel Cron**: Free on Pro plan (100 executions/day)
- **Execution frequency**: 96 times/day (every 15 minutes)
- **Gmail API**: 1 billion quota units/day (250,000 API calls) - Free tier

## Adjusting Sync Frequency

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"    // Every 5 minutes
      // OR
      "schedule": "0 * * * *"       // Every hour
      // OR
      "schedule": "0 */6 * * *"     // Every 6 hours
    }
  ]
}
```

Cron syntax: `minute hour day month weekday`

## Security Notes

- **CRON_SECRET**: Keep this secret secure! Never commit to git
- **Endpoint Protection**: The `/api/cron/sync` endpoint requires Bearer authentication
- **Rate Limiting**: Consider adding rate limits if needed
- **Logs**: Cron execution logs are visible in Vercel Dashboard

## What's Next

Once deployed and running, your inbox will automatically:
- ✅ Fetch new emails every 15 minutes
- ✅ Exclude your own sent emails
- ✅ Show proper sender information
- ✅ Apply the "Important" filter to show only real people
- ✅ Hide newsletters, bots, and automated emails by default
