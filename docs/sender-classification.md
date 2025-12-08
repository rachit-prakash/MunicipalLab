# AI-Powered Sender Classification

## Problem

The "From People" folder was incorrectly classifying automated service emails (like "Google Workspace team") as personal emails because the rule-based filter couldn't distinguish between real people and service accounts with people-like names.

## Solution: Hybrid Two-Stage Classification

We implemented a hybrid approach that combines fast rule-based filtering with AI classification:

### Stage 1: Rule-Based Filter (lib/message-filter.ts)
- **Fast**: Runs immediately, no API cost
- **Clear cases**: Catches obvious automated emails (noreply@, bot@, etc.)
- **Confidence scoring**: Returns confidence level (0-1)

### Stage 2: AI Classification (lib/analysis.ts)
- **Accurate**: AI understands context and nuance
- **Edge cases**: Handles ambiguous senders like "Google Workspace team"
- **Integrated**: Added to existing AI analysis pipeline (runs alongside sentiment, urgency, topic)

## Architecture

```
Email arrives
    ↓
Rule-based filter (message-filter.ts)
    ↓
AI Analysis (analysis.ts) - includes sender classification
    ↓
Store result in DB (threads.sender_type)
    ↓
Folder logic (folders.ts) - prioritizes AI classification
```

## Key Changes

### 1. Database Schema
**File**: `scripts/migrations/add-sender-classification.sql`
- Added `sender_type` column to threads table
- Values: 'person', 'automated', 'uncertain'
- Indexed for performance

### 2. AI Analysis Enhancement
**File**: `lib/analysis.ts`
- Added `senderType` to `MessageAnalysis` type
- Updated AI prompt to classify sender
- AI receives sender info and classifies as: person, automated, or uncertain

Example AI classification:
```typescript
{
  senderType: "automated",  // "Google Workspace team"
  sentimentScore: 0.5,
  urgencyLevel: "low",
  topic: "Account notification",
  confidence: 0.9
}
```

### 3. Data Persistence
**File**: `lib/messageAnalysis.ts`
- Persist `sender_type` to database alongside other AI analysis results

### 4. API Updates
**File**: `app/api/gmail/threads/route.ts`
- Fetch `sender_type` from database
- Include in API response as `senderType`

### 5. Folder Logic
**File**: `lib/folders.ts`
- **Priority 1**: Use AI classification if available
  - `senderType === "person"` → Include in "From People"
  - `senderType === "automated"` → Exclude from "From People"
- **Priority 2**: Fallback to rule-based filter for unanalyzed emails

```typescript
filterFn: (thread) => {
  // Use AI classification if available
  if (thread.senderType === "person") return true
  if (thread.senderType === "automated") return false

  // Fallback to rules for unclassified
  return filterMessage(thread.sender, ...).shouldAnalyze
}
```

## Benefits

1. **Accurate**: AI understands context better than regex patterns
2. **Cost-effective**: Only runs AI for emails that need analysis anyway
3. **Fast**: Rule-based filter still works as first line of defense
4. **Maintainable**: No need to maintain huge pattern lists
5. **Self-improving**: Handles new types of automated emails automatically

## Testing

### 1. Run Migration
```bash
# Connect to your database and run:
psql -d your_database -f scripts/migrations/add-sender-classification.sql
```

### 2. Sync New Emails
When new emails are synced and analyzed, they'll automatically get sender classification.

### 3. Verify Google Workspace Team Email
1. Find a "Google Workspace team" email in your inbox
2. Trigger AI analysis (sync endpoint will do this)
3. Check the "From People" folder - it should NOT appear there
4. Check the database:
   ```sql
   SELECT sender_email, sender_type FROM threads
   WHERE sender_email ILIKE '%google%workspace%';
   ```
   Should show `sender_type = 'automated'`

### 4. Verify Real People Still Work
1. Find an email from a real person (personal email or individual)
2. Verify it still appears in "From People" folder
3. Check database shows `sender_type = 'person'`

## Migration Notes

- **Existing emails**: Will have `sender_type = NULL` initially
  - Will be classified on next sync/analysis
  - Rule-based filter acts as fallback until then
- **No breaking changes**: All changes are backward compatible
- **Zero downtime**: New column is nullable, app works with or without values

## Future Enhancements

1. **Bulk reclassification**: Add script to reclassify all existing emails
2. **User feedback**: Allow users to correct classifications
3. **Learning**: Use corrections to improve AI prompt
4. **Sender whitelist/blacklist**: Manual overrides for specific senders
