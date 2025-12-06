# Policy Intelligence Dashboard

This feature transforms the dashboard from raw data dumps into actionable policy intelligence for elected officials.

## Overview

The Policy Intelligence Dashboard answers the key question: **"What do I need to care about before a reporter calls me?"**

It provides 4 decision-grade insight cards:

1. **New Messages Today** - How busy things are today vs typical (% change from last week)
2. **Top Rising Issue** - Which topic is exploding in constituent attention
3. **Sentiment Shift** - Which topic is turning negative or positive
4. **Urgent Cases** - How many messages need immediate attention

## Architecture

### AI-Powered Analysis

Every incoming message is automatically analyzed using OpenAI/OpenRouter to extract:

- **Sentiment Score** (-1.0 to 1.0): How positive or negative is the constituent's tone?
- **Urgency Level** (low/medium/high/critical): Does this need immediate attention?
- **Urgency Reasons**: Why it's urgent (deadline, angry tone, emergency keywords, legal threat, media mention)
- **Topic Classification**: What policy area (Healthcare, Immigration, Infrastructure, etc.)

### Database Schema

New columns added to the `messages` table:

```sql
sentiment_score NUMERIC(3,2)        -- -1.0 to 1.0
urgency_level TEXT                  -- low, medium, high, critical
urgency_reasons TEXT[]              -- ['deadline', 'angry_tone', ...]
analyzed_at TIMESTAMP WITH TIME ZONE
```

### Components

#### 1. AI Analysis API (`app/api/analysis/analyze-message/route.ts`)

Takes message content and returns structured analysis:

```typescript
{
  sentiment_score: 0.5,
  urgency_level: "medium",
  urgency_reasons: ["deadline"],
  topic: "Healthcare"
}
```

#### 2. Analytics Queries (`lib/dashboard-analytics.ts`)

Server-side functions that query the database for policy intelligence:

- `getNewMessagesToday()` - Compare today vs last week
- `getTopRisingIssue()` - Find fastest-growing topic
- `getSentimentShift()` - Identify biggest sentiment changes
- `getUrgentCases()` - List high-priority messages
- `getPolicyIntelligence()` - Fetch all metrics in parallel

#### 3. KPI Cards (`components/dashboard/kpis.tsx`)

Visual component with 4 color-coded cards:

- Green/Red arrows for trends
- Yellow highlight for urgent items
- Clear, concise messaging

#### 4. Dashboard Page (`app/dashboard/page.tsx`)

Server-side rendered page that:

- Fetches policy intelligence from database
- Passes data to KPI component
- Includes existing charts (Topics, Stance Trends)

#### 5. Sync Integration (`scripts/sync.ts`)

Messages are analyzed during Gmail sync:

- Analysis happens automatically for new inbound messages
- Results stored in database immediately
- Non-blocking (sync continues even if analysis fails)

## Usage

### For New Installations

1. Add the database columns (already documented in `docs/database.sql`)
2. Deploy the code
3. Messages will be analyzed automatically as they arrive

### For Existing Installations

1. Add the database columns in Supabase:

```sql
ALTER TABLE messages ADD COLUMN sentiment_score NUMERIC(3,2);
ALTER TABLE messages ADD COLUMN urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE messages ADD COLUMN urgency_reasons TEXT[];
ALTER TABLE messages ADD COLUMN analyzed_at TIMESTAMP WITH TIME ZONE;
```

2. Deploy the code

3. Run the backfill script to analyze existing messages:

```bash
npx tsx scripts/analyze-messages.ts
```

This will:

- Find all messages from the last 90 days without analysis
- Process them in batches of 10 (to respect rate limits)
- Update the database with results

### Environment Variables

Ensure you have one of these set:

- `OPENAI_API_KEY` - For OpenAI
- `OPENROUTER_API_KEY` - For OpenRouter (fallback)

## Cost Considerations

- **Analysis Cost**: ~$0.0001 per message with GPT-4o-mini
- **Typical Volume**: 100-1000 messages/day = $0.01-$0.10/day
- **Backfill**: One-time cost for historical messages

## Monitoring

The system includes built-in resilience:

- If AI analysis fails, sync continues without it
- Failed analyses are logged to console
- Dashboard gracefully handles missing data ("Not enough data yet")

## Future Enhancements

Potential improvements:

1. **Batch Analysis** - Analyze multiple messages in one API call
2. **Caching** - Cache AI responses for similar messages
3. **Custom Topics** - Allow admins to define custom policy topics
4. **Alerts** - Email/SMS when urgent cases exceed threshold
5. **Historical Trends** - Show month-over-month comparisons

## Testing

To verify the implementation:

1. Check that new messages get analyzed:

```sql
SELECT sentiment_score, urgency_level, analyzed_at
FROM messages
WHERE analyzed_at IS NOT NULL
ORDER BY analyzed_at DESC
LIMIT 10;
```

2. Visit the dashboard at `/dashboard`
3. Verify the 4 KPI cards display correctly
4. Check console for any errors

## Troubleshooting

**Issue**: Dashboard shows "Not enough data yet"

- **Solution**: Run the backfill script or wait for more messages to arrive

**Issue**: AI analysis fails

- **Solution**: Check that `OPENAI_API_KEY` or `OPENROUTER_API_KEY` is set correctly

**Issue**: Dashboard error

- **Solution**: Ensure topics table has data and threads are linked to topics

## Support

For issues or questions, check:

- Database logs in Supabase
- Server logs in your hosting platform
- Browser console for frontend errors


