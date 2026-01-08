import { loadEnvConfig } from "@next/env"
import { query, withTenant } from "@/lib/db"
import { analyzeMessage } from "@/lib/analysis"
import {
  isMessageEligibleForAnalysis,
  persistMessageAnalysis,
} from "@/lib/messageAnalysis"
import { filterMessage } from "@/lib/message-filter"

loadEnvConfig(process.cwd())

type PendingMessage = {
  id: string
  thread_id: string
  subject: string | null
  snippet: string | null
  body_redacted: string | null
  from_email: string | null
  to_email: string[] | null
}

async function main() {
  const tenantFilter = process.argv.slice(2)[0]
  const tenants = tenantFilter
    ? await query(
        `SELECT id, name FROM tenants WHERE id = $1 OR name = $1 LIMIT 1`,
        [tenantFilter],
      )
    : await query(`SELECT id, name FROM tenants ORDER BY created_at ASC`)

  if (!tenants.rows.length) {
    console.log("No tenants found. Did you seed the database?")
    return
  }

  for (const tenant of tenants.rows) {
    await processTenant(tenant.id, tenant.name)
  }
}

async function processTenant(tenantId: string, tenantName?: string) {
  console.log(`\n🧠 Analyzing messages for tenant ${tenantName ?? tenantId}`)
  let processed = 0
  let skippedByFilter = 0
  let filterStats: Record<string, number> = {}

  while (true) {
    const batch = await loadPendingBatch(tenantId, 25)
    if (!batch.length) break

    for (const message of batch) {
      const analysisInput = {
        subject: message.subject ?? undefined,
        snippet: message.snippet ?? undefined,
        body: message.body_redacted ?? undefined,
        from: message.from_email ?? undefined,
        to: message.to_email ?? undefined,
        isOutbound: false,
      }

      if (!isMessageEligibleForAnalysis(analysisInput)) {
        continue
      }

      // 🔍 NEW: Apply smart filter before AI analysis
      const filterResult = filterMessage(
        message.from_email ?? "",
        message.subject ?? undefined,
        message.snippet ?? undefined
      )

      if (!filterResult.shouldAnalyze) {
        skippedByFilter++
        filterStats[filterResult.type] = (filterStats[filterResult.type] || 0) + 1
        console.log(
          `  ⊘ Skipped ${message.from_email?.substring(0, 30)} - ${filterResult.reason}`
        )
        continue
      }

      try {
        const analysis = await analyzeMessage(analysisInput)
        await persistMessageAnalysis({
          tenantId,
          messageId: message.id,
          threadId: message.thread_id,
          subject: message.subject ?? undefined,
          snippet: message.snippet ?? undefined,
          fromEmail: message.from_email ?? undefined,
          analysis,
        })
        processed++
        console.log(
          `  ✓ ${message.from_email?.substring(0, 30)} · topic=${analysis.topic ?? "unknown"} · sentiment=${analysis.sentimentScore?.toFixed(2) ?? "N/A"}`,
        )
      } catch (error) {
        console.error(`  ✗ Failed to analyze ${message.id}:`, error)
      }
    }
  }

  console.log("\n" + "═".repeat(60))
  if (processed === 0 && skippedByFilter === 0) {
    console.log("  No pending messages. All caught up!")
  } else {
    console.log(`  ✅ Analyzed: ${processed} messages`)
    console.log(`  ⊘ Skipped by filter: ${skippedByFilter} messages`)
    if (Object.keys(filterStats).length > 0) {
      console.log(`  📊 Filter breakdown:`)
      for (const [type, count] of Object.entries(filterStats)) {
        console.log(`     - ${type}: ${count}`)
      }
    }
    const total = processed + skippedByFilter
    const savingsPercent = total > 0 ? ((skippedByFilter / total) * 100).toFixed(1) : "0"
    console.log(`  💰 Cost savings: ${savingsPercent}% (${skippedByFilter}/${total} skipped)`)
  }
  console.log("═".repeat(60))
}

async function loadPendingBatch(
  tenantId: string,
  limit: number,
): Promise<PendingMessage[]> {
  return withTenant(tenantId, async (client) => {
    const { rows } = await client.query<PendingMessage>(
      `SELECT 
        m.id,
        m.thread_id,
        th.subject AS subject,
        m.snippet,
        m.body_redacted,
        m.from_email,
        m.to_email
      FROM messages m
      JOIN threads th ON th.id = m.thread_id
      WHERE m.tenant_id = $1
        AND m.is_outbound = false
        AND m.analyzed_at IS NULL
      ORDER BY m.internal_date DESC
      LIMIT $2`,
      [tenantId, limit],
    )
    return rows
  })
}

main()
  .then(() => {
    console.log("\nAll tenants processed.")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Analyzer script failed:", error)
    process.exit(1)
  })

