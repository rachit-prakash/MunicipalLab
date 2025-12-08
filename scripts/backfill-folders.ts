/**
 * Backfill script to classify existing threads and assign folders
 *
 * This script:
 * 1. Finds all threads with only 'inbox' folder (needs classification)
 * 2. Classifies them using the rule-based filter
 * 3. Updates the folders column
 *
 * Usage: npx tsx scripts/backfill-folders.ts
 */

import { query } from "@/lib/db"
import { classifyMessageToFoldersSync } from "@/lib/analysis"

async function backfillFolders() {
  console.log("🔄 Starting folder backfill...")

  // Get all threads with only inbox folder (needs proper classification)
  const threadsResult = await query(`
    SELECT
      id,
      sender_email,
      subject,
      summary,
      snippet
    FROM threads
    WHERE folders = ARRAY['inbox']::text[]
       OR array_length(folders, 1) = 1 AND folders[1] = 'inbox'
    ORDER BY last_message_ts DESC
    LIMIT 1000
  `)

  const threads = threadsResult.rows
  console.log(`📊 Found ${threads.length} threads to classify`)

  if (threads.length === 0) {
    console.log("✅ All threads already have folders assigned!")
    return
  }

  let processed = 0
  let errors = 0

  for (const thread of threads) {
    try {
      // Classify using rule-based logic
      const folders = classifyMessageToFoldersSync(
        thread.sender_email || "",
        thread.subject || "",
        thread.summary || thread.snippet || ""
      )

      // Update thread with folders
      await query(
        `UPDATE threads SET folders = $1, updated_at = NOW() WHERE id = $2`,
        [folders, thread.id]
      )

      processed++

      // Progress indicator
      if (processed % 10 === 0) {
        console.log(`  ⏳ Processed ${processed}/${threads.length} threads...`)
      }
    } catch (error) {
      errors++
      console.error(`  ❌ Error processing thread ${thread.id}:`, error)
    }
  }

  console.log("\n✅ Backfill complete!")
  console.log(`   Processed: ${processed}`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Total: ${threads.length}`)

  // Show folder distribution
  const statsResult = await query(`
    SELECT
      unnest(folders) as folder,
      COUNT(*) as count
    FROM threads
    WHERE folders IS NOT NULL
    GROUP BY folder
    ORDER BY count DESC
  `)

  console.log("\n📊 Folder distribution:")
  for (const row of statsResult.rows) {
    console.log(`   ${row.folder}: ${row.count} threads`)
  }
}

backfillFolders()
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  })
