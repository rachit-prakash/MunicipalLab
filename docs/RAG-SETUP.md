# RAG Setup Guide - Email Context for Chatbot

## 🎯 What is RAG?

**RAG (Retrieval-Augmented Generation)** is like giving your chatbot a smart memory! Instead of the AI just answering from what it was trained on, it can now:

1. **Search through all your emails** using semantic search (understanding meaning, not just keywords)
2. **Find relevant context** before answering
3. **Provide analytics** like "how many emails this week?" or "who are the top senders?"
4. **Answer based on YOUR actual data**, not generic responses

Think of it like this: Before RAG, your chatbot was like a librarian with no books. Now it has access to your entire email library! 📚

---

## 🚀 Quick Start

### Step 1: Enable pgvector in Your Database

Run this SQL migration to add vector search capabilities:

```bash
# Connect to your Supabase/Postgres database
psql YOUR_DATABASE_URL

# Run the migration
\i scripts/add-embeddings.sql
```

Or if using Supabase dashboard:
1. Go to SQL Editor
2. Copy contents of `scripts/add-embeddings.sql`
3. Click "Run"

**What this does:**
- Adds the `pgvector` extension (for vector similarity search)
- Adds `embedding` columns to `messages` and `threads` tables
- Creates search functions for fast retrieval
- Adds helpful indexes

### Step 2: Add OpenAI API Key

Make sure you have an OpenAI API key in your `.env` file:

```env
OPENAI_API_KEY=sk-your-key-here
```

**Why OpenAI?** We use their embedding API to convert text into vectors (numbers that represent meaning). It's very affordable - typically $0.02 per 1000 emails.

### Step 3: Generate Embeddings for Existing Emails

Run this script to create embeddings for all your existing emails:

```bash
npx tsx scripts/generate-embeddings.ts
```

**Options:**
```bash
# Process a specific tenant only
npx tsx scripts/generate-embeddings.ts --tenant-id=YOUR_TENANT_ID

# Change batch size (default is 50)
npx tsx scripts/generate-embeddings.ts --batch-size=100
```

**What happens:**
- Script fetches all messages and threads
- Sends them to OpenAI to generate embeddings
- Stores embeddings in your database
- Shows progress as it goes

**Time estimate:** 
- ~1000 emails = 2-3 minutes
- ~10,000 emails = 20-30 minutes

### Step 4: Test the Chatbot!

Go to `/chatbot` in your app and try these questions:

**Semantic Search Questions:**
- "Show me emails about zoning regulations"
- "Find messages from angry constituents"
- "What are people saying about the new park?"

**Analytics Questions:**
- "How many emails did I receive this week?"
- "Who are my top 5 senders?"
- "Show me the breakdown by topic"
- "How many urgent emails do I have?"

---

## 🔧 How It Works

### Architecture Overview

```
User asks question
      ↓
Chatbot API receives query
      ↓
[Is this analytics or search?]
      ↓
├─ ANALYTICS PATH:          ├─ SEARCH PATH:
│  - Parse date/filters     │  - Convert question to embedding
│  - Query database         │  - Search similar email embeddings
│  - Count/aggregate        │  - Retrieve top matching emails
│  - Format stats           │  - Format context
      ↓                           ↓
Context added to LLM prompt
      ↓
AI generates answer with context
      ↓
User gets informed response!
```

### What are Embeddings?

Embeddings are like a "meaning fingerprint" for text:

```
"The park project is behind schedule" → [0.23, -0.45, 0.67, ..., 0.12]
                                         ↑
                                    1536 numbers representing the meaning
```

Similar texts have similar vectors, so we can find related emails even if they use different words!

**Example:**
- "The playground is delayed" 
- "Park construction is running late"

These would have similar embeddings even though they use different words, because they mean similar things!

---

## 📊 Features Included

### 1. Semantic Search
Finds emails by meaning, not just keywords:

```typescript
// In your chatbot:
"Find complaints about noise" 
→ Retrieves emails about loud parties, construction sounds, barking dogs, etc.
```

### 2. Email Analytics
Answers statistical questions:

```typescript
"How many emails this week?"
→ Total Messages: 47
   Total Threads: 23
   
   By Topic:
   - Zoning: 15 emails
   - Parks: 12 emails
   - Traffic: 8 emails
```

### 3. Smart Context
The AI knows which emails are relevant:

```typescript
User: "What did John say about the proposal?"
→ [Retrieves John's emails about proposals]
→ AI: "In his email from Dec 1st, John expressed concerns about..."
```

---

## 🔄 Keeping Embeddings Updated

### Option A: Automatic (Recommended)

Add embedding generation to your sync process:

```typescript
// In your sync script or API route
import { generateMessageEmbedding } from '@/lib/sync-embeddings'

// After inserting/updating a message:
await generateMessageEmbedding(tenantId, messageId, {
  subject: thread.subject,
  from_email: message.from,
  body_redacted: sanitizedBody,
  snippet: message.snippet
})
```

### Option B: Batch Processing

Run the script periodically (e.g., daily):

```bash
# Add to cron or scheduled task
0 2 * * * cd /app && npx tsx scripts/generate-embeddings.ts
```

---

## 💰 Cost Estimation

### OpenAI Embedding Costs

**text-embedding-3-small** (what we use):
- $0.02 per 1 million tokens
- ~1 token per word
- Average email: ~200 words = $0.000004

**Examples:**
- 1,000 emails = ~$0.01
- 10,000 emails = ~$0.10
- 100,000 emails = ~$1.00

**Per user query:**
- Each chatbot question: ~$0.00001 (negligible)

### Storage Costs

Each embedding is 1536 floats (6KB):
- 1,000 emails = ~6 MB
- 10,000 emails = ~60 MB
- 100,000 emails = ~600 MB

In Supabase/Postgres, this is very cheap (included in most plans).

---

## 🎨 Customization

### Adjust Retrieval Settings

In `lib/rag.ts`, you can tune these parameters:

```typescript
export async function retrieveEmailContext(
  userQuery: string,
  tenantId: string,
  options: {
    maxMessages?: number,      // How many messages to retrieve (default: 5)
    maxThreads?: number,        // How many threads to retrieve (default: 3)
    minSimilarity?: number,     // Minimum similarity score 0-1 (default: 0.5)
    includeMessages?: boolean,  // Search individual messages (default: true)
    includeThreads?: boolean,   // Search thread summaries (default: true)
  }
)
```

**Tuning tips:**
- **More results = more context** but slower and more tokens used
- **Higher minSimilarity = stricter** matches (0.7+ is very strict)
- **Lower minSimilarity = looser** matches (0.3 is very loose)

### Use Different Embedding Models

Edit `lib/embeddings.ts`:

```typescript
// For better quality (more expensive):
generateEmbedding(text, "text-embedding-3-large")  // 3072 dimensions

// For faster/cheaper:
generateEmbedding(text, "text-embedding-3-small")  // 1536 dimensions (default)
```

**Note:** If you change models, you need to:
1. Update the vector size in `add-embeddings.sql`
2. Regenerate all embeddings
3. Rebuild indexes

---

## 🐛 Troubleshooting

### "Extension 'vector' does not exist"

**Solution:** Run the migration script:
```bash
psql YOUR_DATABASE_URL < scripts/add-embeddings.sql
```

### "Missing OPENAI_API_KEY"

**Solution:** Add to your `.env` file:
```env
OPENAI_API_KEY=sk-...
```

### Embeddings generation is slow

**Solutions:**
1. Increase batch size: `--batch-size=100`
2. Use a faster OpenAI tier (paid accounts have higher rate limits)
3. Run during off-peak hours

### Chatbot not finding relevant emails

**Solutions:**
1. Lower `minSimilarity` threshold (try 0.3 instead of 0.5)
2. Increase `maxMessages` and `maxThreads`
3. Check that embeddings were generated: 
   ```sql
   SELECT COUNT(*) FROM messages WHERE embedding IS NOT NULL;
   ```

### Getting "rate limit exceeded" errors

**Solutions:**
1. Reduce batch size: `--batch-size=20`
2. Add delays between batches (already included in script)
3. Upgrade your OpenAI account tier

---

## 📈 Performance Tips

### 1. Optimize Indexes

For large datasets (100k+ emails), tune the ivfflat index:

```sql
-- Adjust 'lists' parameter based on row count
-- Rule of thumb: lists = sqrt(row_count)
DROP INDEX messages_embedding_idx;
CREATE INDEX messages_embedding_idx 
ON messages 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 500);  -- Increase for more rows
```

### 2. Filter Before Search

Add date/topic filters to reduce search space:

```typescript
// In lib/rag.ts, modify search functions to add WHERE clauses:
WHERE m.tenant_id = $1 
  AND m.embedding IS NOT NULL
  AND m.internal_date > NOW() - INTERVAL '30 days'  -- Only recent
  AND (1 - (m.embedding <=> $2)) > $3
```

### 3. Cache Common Queries

Add caching for frequently asked questions:

```typescript
// In your API route:
import { cacheGet, cacheSet } from '@/lib/cache'

const cacheKey = `rag:${tenantId}:${userQuery}`
let context = await cacheGet(cacheKey)

if (!context) {
  context = await retrieveEmailContext(userQuery, tenantId)
  await cacheSet(cacheKey, context, 300)  // Cache 5 minutes
}
```

---

## 🚦 Next Steps

### Immediate:
1. ✅ Run the database migration
2. ✅ Generate embeddings for existing emails
3. ✅ Test the chatbot with sample queries

### Soon:
1. Add embedding generation to your sync process
2. Monitor embedding generation and RAG usage in analytics
3. Fine-tune retrieval parameters based on user feedback

### Future Enhancements:
1. **Multi-modal RAG**: Include attachments, images
2. **Hybrid Search**: Combine semantic + keyword search
3. **Re-ranking**: Use a second model to re-rank results
4. **User Feedback**: Let users thumbs up/down results to improve
5. **Custom Embeddings**: Fine-tune embeddings for legal/government language

---

## 📚 Learn More

### Key Files:
- `lib/embeddings.ts` - Embedding generation utilities
- `lib/rag.ts` - RAG retrieval and formatting
- `lib/sync-embeddings.ts` - Helpers for sync integration
- `app/api/assistant/chat/route.ts` - Chatbot API with RAG
- `scripts/generate-embeddings.ts` - Batch embedding generation

### Useful Resources:
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)

---

## 🎉 You're All Set!

Your chatbot now has access to all your email data through semantic search and analytics. Users can ask natural questions and get answers based on real data.

**Try it out:**
1. Go to `/chatbot` in your app
2. Ask: "What are people emailing about this week?"
3. Watch your AI assistant search through emails and provide insights! 🚀

Have questions? The RAG system is designed to be extensible - feel free to customize it for your specific needs!



