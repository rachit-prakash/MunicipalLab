# Constituent Relationship Memory

## Overview

The **Constituent Relationship Memory** feature transforms your inbox from a simple message list into an intelligent relationship management system. Every time a constituent emails you, the system builds a comprehensive profile showing their communication history, sentiment trends, key concerns, and behavioral patterns.

### Why This Changes Everything

**Gmail shows you emails. Legaside shows you people.**

When you hover over a constituent's email address, you instantly see:
- How many times they've contacted you
- Whether they're happy, frustrated, or neutral (and if sentiment is improving)
- What topics they care about most
- Key phrases they use ("my daughter's asthma", "school funding cuts")
- Their typical communication patterns (urgent vs. calm, when they usually email)
- Their position history on different issues

This context transforms how you respond - you're not just answering an email, you're continuing a relationship.

---

## Features

### 1. **Smart Profile Cards**
Hover over any email address in the threads list or reply drawer to see:

#### Header Section
- Constituent name (extracted from email)
- Email address
- Total emails sent
- First contact date ("Since Jan 2024")

#### Sentiment Insight
- Emoji indicator (😊 positive, 😐 neutral, 😟 negative)
- Average sentiment percentage
- Trend indicator:
  - 🔼 Improving (getting more positive)
  - 🔽 Declining (getting more negative)
  - ➖ Stable

#### Top Topics
- Up to 3 most-discussed topics with frequency counts
- Example: "Healthcare ×12, Immigration ×5, Education ×3"

#### Key Phrases
- Automatically extracted memorable quotes
- What they care about in their own words
- Example: "daughter's asthma", "property tax increases", "school safety"

#### Engagement Pattern
- **Urgency Profile**: Usually Urgent | Sometimes Urgent | Usually Calm
- **Last Contact**: Relative time ("3 days ago", "2 weeks ago")

#### Position History
- Visual breakdown by topic showing Support/Oppose/Neutral split
- Progress bars showing stance distribution
- Example: "Healthcare: 80% Support, 20% Neutral"

---

## Architecture

### Database Schema

```sql
CREATE TABLE constituent_profiles (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  name text,

  -- Aggregate stats
  total_emails integer DEFAULT 0,
  total_casework integer DEFAULT 0,
  total_correspondence integer DEFAULT 0,
  first_contact timestamp,
  last_contact timestamp,

  -- Sentiment tracking
  avg_sentiment numeric(4,3),
  sentiment_trend text,
  sentiment_history jsonb,

  -- Topic analysis
  top_topics jsonb,

  -- Insights
  key_phrases text[],
  stance_history jsonb,

  -- Behavioral patterns
  typical_email_days integer[],
  typical_email_hours integer[],
  urgency_profile text,

  -- Metadata
  last_analyzed_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),

  UNIQUE (tenant_id, email)
);
```

### Intelligence Engine

The profile builder (`lib/constituent-intelligence.ts`) aggregates data from:

1. **Threads table**: Total emails, casework vs correspondence split, topics, stances
2. **Messages table**: Sentiment scores, urgency levels, timing patterns
3. **Email content**: Key phrases extracted from summaries

**Smart caching**: Profiles are cached for 24 hours. After that, they rebuild automatically on next access.

### API Layer

- **GET `/api/constituents/[email]`**: Fetch or build profile for a specific constituent
- **POST `/api/admin/build-profiles`**: Trigger background rebuild for all constituents

---

## Setup Instructions

### 1. Run the Migration

Apply the database migration to create the `constituent_profiles` table:

```bash
# If using Supabase or hosted Postgres
psql $DATABASE_URL -f scripts/migrations/add-constituent-profiles.sql

# Or via your database client
# Copy the SQL from scripts/migrations/add-constituent-profiles.sql
```

### 2. Build Initial Profiles

After migration, populate profiles for existing constituents:

```bash
# Build profiles for all tenants
pnpm tsx scripts/build-constituent-profiles.ts

# Or build for a specific tenant
pnpm tsx scripts/build-constituent-profiles.ts <tenant-uuid>
```

Expected output:
```
🚀 Starting constituent profile builder...
📊 Building profiles for all tenants...

📂 Processing tenant: MunicipalLabs Demo (abc-123-def)
   ✅ Built 247 profiles

🎉 Total: Built 247 constituent profiles across 1 tenants
```

### 3. Verify Installation

1. Start your dev server: `pnpm dev`
2. Navigate to `/threads`
3. Hover over any sender email in the "From" column
4. You should see a beautiful profile card appear!

---

## Usage

### In the Threads List

Every email in the threads table now shows the sender with an avatar:

```
┌─────────────────────────────────────┐
│ From                                │
├─────────────────────────────────────┤
│ [J] john.smith@email.com            │ ← Hover here!
│     Re: Healthcare concerns         │
└─────────────────────────────────────┘
```

Hover over the sender to see their full profile.

### In the Reply Drawer

When you click "Suggest Reply", the drawer shows the constituent's email as a hoverable link:

```
From: john.smith@email.com ← Hover to see profile before replying
```

This gives you instant context to personalize your response.

---

## Maintenance

### Automatic Updates

Profiles automatically rebuild when:
- A constituent is accessed and their profile is >24 hours old
- The constituent sends a new email (triggered on next access)

### Manual Rebuild

To force a rebuild of all profiles:

**Option 1: Via Script** (recommended for scheduled jobs)
```bash
pnpm tsx scripts/build-constituent-profiles.ts
```

**Option 2: Via API** (requires authentication)
```bash
curl -X POST http://localhost:3000/api/admin/build-profiles \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Scheduled Rebuilds

**Option 1: Cron Job** (if self-hosting)
```bash
# Add to crontab (rebuild nightly at 2am)
0 2 * * * cd /path/to/legaside && pnpm tsx scripts/build-constituent-profiles.ts
```

**Option 2: Vercel Cron** (if using Vercel)

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/build-profiles",
    "schedule": "0 2 * * *"
  }]
}
```

---

## Performance Considerations

### Database Queries

The profile builder runs 7 queries per constituent:
1. Basic stats (threads count, casework vs correspondence)
2. Sentiment analysis (avg sentiment, history points)
3. Top topics (top 5 by count)
4. Stance history (support/oppose/neutral breakdown)
5. Key phrases (extracted from summaries)
6. Timing patterns (days/hours of email activity)
7. Urgency profile (percentage of high/critical urgency)

**Optimization**: Queries use indexes on `tenant_id`, `sender_email`, and `internal_date`.

### Caching Strategy

- Profiles are stored in the database (not memory)
- 24-hour cache TTL
- On-demand rebuild for stale profiles
- Background rebuild doesn't block API response

### Scaling

For high-volume tenants (1000+ constituents):
- Background rebuild takes ~2-5 minutes
- API responses are <200ms (cached profiles)
- First-time profile build: ~1-2 seconds

---

## Customization

### Adjusting Cache TTL

Edit `app/api/constituents/[email]/route.ts`:

```typescript
// Change 24 hours to 1 week
const needsRebuild =
  !profile ||
  !profile.lastAnalyzedAt ||
  new Date().getTime() - new Date(profile.lastAnalyzedAt).getTime() > 7 * 24 * 60 * 60 * 1000
```

### Adjusting Key Phrase Extraction

Edit `lib/constituent-intelligence.ts`:

```typescript
// Change number of summaries to analyze
LIMIT 10  // ← Change to 20 for more phrases

// Change phrase extraction regex
const matches = row.summary.match(/"([^"]{5,50})"/g)  // ← Customize pattern
```

### Adding More Profile Fields

1. Add column to database:
```sql
ALTER TABLE constituent_profiles
ADD COLUMN custom_field text;
```

2. Update interface in `lib/constituent-intelligence.ts`:
```typescript
export interface ConstituentProfile {
  // ... existing fields
  customField?: string
}
```

3. Calculate field in `buildConstituentProfile`:
```typescript
const customValue = "calculated value"

// Add to INSERT/UPDATE query
custom_field = $18
```

4. Display in `components/constituents/profile-card.tsx`:
```tsx
{profile.customField && (
  <div className="text-xs">
    Custom: {profile.customField}
  </div>
)}
```

---

## Troubleshooting

### Profile Card Not Appearing

**Check 1**: Verify migration ran successfully
```sql
SELECT * FROM constituent_profiles LIMIT 1;
```

**Check 2**: Check browser console for errors
- Open DevTools (F12)
- Look for 401 Unauthorized or 500 errors

**Check 3**: Verify profile exists
```bash
curl http://localhost:3000/api/constituents/test@email.com
```

### "Failed to load profile" Error

**Cause**: Database connection issue or missing tenant

**Fix**:
1. Check DATABASE_URL is set correctly
2. Verify user has gmail_accounts entry
3. Check logs for detailed error:
```bash
# In terminal running dev server
# Look for "Constituent profile fetch error:"
```

### Profiles Are Stale

**Cause**: Last rebuild was >24 hours ago

**Fix**: Trigger manual rebuild
```bash
pnpm tsx scripts/build-constituent-profiles.ts
```

### Profile Build is Slow

**Cause**: Large tenant with 1000+ constituents

**Optimization**:
1. Run rebuild during off-hours
2. Add more database indexes:
```sql
CREATE INDEX idx_messages_from_email ON messages(from_email);
CREATE INDEX idx_threads_sender_email ON threads(sender_email);
```

---

## Future Enhancements

Potential additions to make profiles even more powerful:

### 1. **Predictive Insights**
- "John typically emails on Mondays at 9am - expect a message soon"
- "Sarah's sentiment has been declining - consider priority response"

### 2. **Social Media Integration**
- Pull profile photo from Gravatar/social APIs
- Show Twitter/LinkedIn handles if available

### 3. **Relationship Score**
- Calculate "relationship health" score (0-100)
- Factors: response time, sentiment trend, engagement frequency

### 4. **Smart Tags**
- Auto-tag constituents: "VIP", "Frequent Emailer", "Needs Attention"
- Custom tags added by staff

### 5. **Meeting History**
- Integrate with calendar to show past/upcoming meetings
- "Last met: 3 months ago at Town Hall"

### 6. **Household Clustering**
- Group emails from same household/organization
- "Part of Smith Family (3 members contact you)"

### 7. **Comparison View**
- "This constituent emails 3x more than average"
- "Response time 40% faster than office average"

---

## Impact Metrics

Track the effectiveness of this feature:

### User Engagement
- % of staff who hover on profiles daily
- Average time spent viewing profiles
- Click-through rate from profile to full thread

### Response Quality
- Reduction in generic replies (measure personalization keywords)
- Constituent satisfaction scores (follow-up sentiment)
- Time saved per reply (staff survey)

### Relationship Insights
- Number of at-risk constituents identified (declining sentiment)
- VIP constituent engagement tracking
- Topic trend identification accuracy

---

## Credits

This feature was inspired by:
- Superhuman's contact profiles
- HubSpot CRM relationship intelligence
- Gmail's "People sidebar" (but 10x better)

Built with:
- PostgreSQL for data storage
- React hover cards for smooth UX
- OpenAI sentiment analysis
- Radix UI primitives

---

## Support

Questions? Issues? Ideas for improvement?

1. Check the troubleshooting section above
2. Review the architecture diagram
3. Open an issue on GitHub
4. Contact the development team

**Remember**: The goal is to make every constituent feel known and valued. This feature gives you superpowers - use them wisely! 🦸‍♀️
