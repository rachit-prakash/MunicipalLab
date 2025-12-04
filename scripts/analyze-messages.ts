import { loadEnvConfig } from "@next/env"
import { query, withTenant } from "@/lib/db"
import { analyzeMessage } from "@/lib/analysis"
import {
  isMessageEligibleForAnalysis,
  persistMessageAnalysis,
} from "@/lib/messageAnalysis"

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
          `  ✓ ${message.id} · topic=${analysis.topic ?? "unknown"} · urgency=${
            analysis.urgencyLevel
          }`,
        )
      } catch (error) {
        console.error(`  ✗ Failed to analyze ${message.id}:`, error)
      }
    }
  }

  if (processed === 0) {
    console.log("  No pending messages. All caught up!")
  } else {
    console.log(`  Completed ${processed} analyses.`)
  }
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

