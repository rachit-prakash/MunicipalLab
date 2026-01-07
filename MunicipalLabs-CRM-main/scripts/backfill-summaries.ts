/**
 * Backfill AI summaries for threads that don't have them
 *
 * Usage: pnpm tsx scripts/backfill-summaries.ts [--limit N] [--dry-run]
 */

import { createClient } from "@supabase/supabase-js"
import { generateSummary, type MessageForAnalysis } from "../lib/analysis"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Parse command line args
const args = process.argv.slice(2)
const limitIndex = args.indexOf("--limit")
const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : 100
const dryRun = args.includes("--dry-run")

async function backfillSummaries() {
  console.log(`Backfilling summaries (limit: ${limit}, dry-run: ${dryRun})...`)

  // Get threads without summaries
  const { data: threads, error: threadsError } = await supabase
    .from("threads")
    .select("id, subject, snippet, sender_email")
    .is("summary", null)
    .limit(limit)

  if (threadsError) {
    console.error("Error fetching threads:", threadsError)
    return
  }

  console.log(`Found ${threads?.length || 0} threads without summaries`)

  if (!threads || threads.length === 0) {
    console.log("No threads to process")
    return
  }

  let processed = 0
  let failed = 0

  for (const thread of threads) {
    try {
      console.log(`Processing thread ${thread.id}...`)

      // Get the first message for this thread
      const { data: messages } = await supabase
        .from("messages")
        .select("body_redacted, snippet, from_email")
        .eq("thread_id", thread.id)
        .eq("is_outbound", false)
        .order("internal_date", { ascending: true })
        .limit(1)

      const firstMessage = messages?.[0]

      // Build message for analysis
      const messageForAnalysis: MessageForAnalysis = {
        subject: thread.subject,
        snippet: thread.snippet || firstMessage?.snippet,
        body: firstMessage?.body_redacted,
        from: thread.sender_email || firstMessage?.from_email,
      }

      if (dryRun) {
        console.log(`  [DRY RUN] Would generate summary for: ${thread.subject}`)
        processed++
        continue
      }

      // Generate summary
      const summary = await generateSummary(messageForAnalysis)
      console.log(`  Generated summary: "${summary.substring(0, 60)}..."`)

      // Update thread with summary
      const { error: updateError } = await supabase
        .from("threads")
        .update({ summary })
        .eq("id", thread.id)

      if (updateError) {
        console.error(`  Failed to update thread ${thread.id}:`, updateError)
        failed++
      } else {
        console.log(`  ✓ Updated thread ${thread.id}`)
        processed++
      }

      // Rate limit: wait 1 second between API calls
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`  Error processing thread ${thread.id}:`, error)
      failed++
    }
  }

  console.log(`\nDone! Processed: ${processed}, Failed: ${failed}`)
}

backfillSummaries().catch(console.error)
