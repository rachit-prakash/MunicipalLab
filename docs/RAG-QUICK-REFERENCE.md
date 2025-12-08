# RAG Quick Reference Card

## 🚀 3-Step Setup

```bash
# 1. Run database migration
psql YOUR_DATABASE_URL < scripts/add-embeddings.sql

# 2. Add API key to .env
echo "OPENAI_API_KEY=sk-your-key-here" >> .env

# 3. Generate embeddings
npx tsx scripts/generate-embeddings.ts
```

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `lib/embeddings.ts` | Generate embeddings from text |
| `lib/rag.ts` | RAG search & analytics |
| `lib/sync-embeddings.ts` | Real-time embedding updates |
| `scripts/add-embeddings.sql` | Database migration |
| `scripts/generate-embeddings.ts` | Batch embedding generation |

---

## 💬 Example Queries

### Semantic Search
```
"Show me emails about parking"
"Find angry messages"
"What are people saying about the park?"
```

### Analytics
```
"How many emails this week?"
"Top 5 senders?"
"Breakdown by topic"
"Sentiment distribution"
```

---

## 🔧 Tune Performance

### In `lib/rag.ts`:
```typescript
retrieveEmailContext(query, tenantId, {
  maxMessages: 5,        // More = more context
  maxThreads: 3,         // More = more context
  minSimilarity: 0.5,    // Higher = stricter
})
```

### Common Adjustments:
- **Too few results?** Lower `minSimilarity` to 0.3
- **Too slow?** Reduce `maxMessages` to 3
- **Not relevant?** Increase `minSimilarity` to 0.7

---

## 💰 Costs

| Item | Cost |
|------|------|
| 1,000 emails | $0.01 |
| 10,000 emails | $0.10 |
| Per query | $0.00001 |
| **Monthly (typical)** | **$0.02** |

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Extension 'vector' does not exist" | Run migration SQL |
| "Missing OPENAI_API_KEY" | Add to .env |
| No results found | Lower minSimilarity |
| Slow generation | Reduce batch-size |

---

## 📊 Check Status

```sql
-- Check embeddings coverage
SELECT 
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE embedding IS NOT NULL) * 100.0 / COUNT(*), 2) as coverage_percent
FROM messages;

-- Check search function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'search_messages_by_embedding';
```

---

## 🔄 Keep Updated

Add to your sync process:

```typescript
import { generateMessageEmbedding } from '@/lib/sync-embeddings'

// After inserting message:
await generateMessageEmbedding(tenantId, messageId, {
  subject, from_email, body_redacted, snippet
})
```

---

## 📚 Full Documentation

- **Setup Guide**: `docs/RAG-SETUP.md`
- **Implementation Summary**: `docs/RAG-IMPLEMENTATION-SUMMARY.md`
- **This Quick Ref**: `docs/RAG-QUICK-REFERENCE.md`

---

## ✅ Checklist

- [ ] Database migration run
- [ ] OpenAI API key added
- [ ] Embeddings generated
- [ ] Tested chatbot queries
- [ ] Added to sync process (optional)
- [ ] Set up monitoring (optional)

---

**Questions?** Check `docs/RAG-SETUP.md` for detailed explanations!




