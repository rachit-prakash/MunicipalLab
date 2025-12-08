/**
 * Reclassification script using improved algorithm
 *
 * This script reclassifies ALL threads using the new improved filter
 * that detects company names in the From field
 */
import { query } from "@/lib/db"
import { classifyMessageToFoldersSync } from "@/lib/analysis"

async function reclassifyAllThreads() {
  console.log("🔄 Starting reclassification with improved algorithm...")

  // Get ALL threads
  const threadsResult = await query(`
    SELECT
      id,
      sender_email,
      subject,
      summary,
      snippet,
      folders
    FROM threads
    ORDER BY last_message_ts DESC
  `)

  const threads = threadsResult.rows
  console.log(`📊 Found ${threads.length} threads to reclassify\n`)

  let updated = 0
  let unchanged = 0
  let errors = 0

  for (const thread of threads) {
    try {
      // Classify using improved rule-based logic
      const newFolders = classifyMessageToFoldersSync(
        thread.sender_email || "",
        thread.subject || "",
        thread.summary || thread.snippet || ""
      )

      const oldFolders = thread.folders || ["inbox"]

      // Compare old and new folders
      const foldersChanged =
        JSON.stringify(oldFolders.sort()) !== JSON.stringify(newFolders.sort())

      if (foldersChanged) {
        // Update thread with new folders
        await query(
          `UPDATE threads SET folders = $1, updated_at = NOW() WHERE id = $2`,
          [newFolders, thread.id]
        )

        updated++

        // Log significant changes (from-people changes)
        const wasFromPeople = oldFolders.includes("from-people")
        const nowFromPeople = newFolders.includes("from-people")

        if (wasFromPeople !== nowFromPeople) {
          const direction = nowFromPeople ? "→ FROM-PEOPLE" : "FROM-PEOPLE →"
          console.log(
            `  📝 ${direction}: ${thread.sender_email?.substring(0, 40) || "unknown"}`
          )
        }
      } else {
        unchanged++
      }

      // Progress indicator
      if ((updated + unchanged) % 50 === 0) {
        console.log(
          `  ⏳ Processed ${updated + unchanged}/${threads.length} threads...`
        )
      }
    } catch (error) {
      errors++
      console.error(`  ❌ Error processing thread ${thread.id}:`, error)
    }
  }

  console.log("\n✅ Reclassification complete!")
  console.log(`   Updated: ${updated}`)
  console.log(`   Unchanged: ${unchanged}`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Total: ${threads.length}`)

  // Show new folder distribution
  const statsResult = await query(`
    SELECT
      unnest(folders) as folder,
      COUNT(*) as count
    FROM threads
    WHERE folders IS NOT NULL
    GROUP BY folder
    ORDER BY count DESC
  `)

  console.log("\n📊 New folder distribution:")
  for (const row of statsResult.rows) {
    console.log(`   ${row.folder}: ${row.count} threads`)
  }

  // Show sample "from-people" threads
  const sampleResult = await query(`
    SELECT sender_email
    FROM threads
    WHERE 'from-people' = ANY(folders)
    ORDER BY last_message_ts DESC
    LIMIT 10
  `)

  console.log("\n📬 Sample 'from-people' threads:")
  for (const row of sampleResult.rows) {
    console.log(`   - ${row.sender_email}`)
  }
}

reclassifyAllThreads()
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  })
