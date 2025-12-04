import { loadEnvConfig } from "@next/env"
import { getPolicyIntelligence } from "../lib/dashboard-analytics"
import { query as dbQuery } from "../lib/db"

loadEnvConfig(process.cwd())

async function main() {
  const tenants = await dbQuery(`SELECT id, name FROM tenants ORDER BY created_at ASC`)

  if (!tenants.rows.length) {
    console.log("No tenants found. Nothing to test.")
    return
  }

  for (const tenant of tenants.rows) {
    await reportTenant(tenant.id, tenant.name)
  }
}

async function reportTenant(tenantId: string, tenantName?: string) {
  console.log(`\n📊 Tenant: ${tenantName ?? tenantId}`)

  const stats = await dbQuery(
    `SELECT
        COUNT(*) FILTER (WHERE is_outbound = false) AS inbound_total,
        COUNT(*) FILTER (WHERE is_outbound = false AND analyzed_at IS NOT NULL) AS analyzed_total,
        COUNT(*) FILTER (WHERE urgency_level IN ('high','critical')) AS urgent_total
      FROM messages
      WHERE tenant_id = $1`,
    [tenantId],
  )

  const row = stats.rows[0]
  console.log(
    `  Messages analyzed: ${row.analyzed_total ?? 0} / ${row.inbound_total ?? 0}`,
  )
  console.log(`  Urgent cases: ${row.urgent_total ?? 0}`)

  try {
    const policyIntel = await getPolicyIntelligence(tenantId, "UTC")
    console.log("  KPI Snapshot:")
    console.log(
      `    • New messages today: ${policyIntel.newMessagesToday.count} (${policyIntel.newMessagesToday.percentChange}% vs avg)`,
    )
    console.log(
      `    • Top rising issue: ${
        policyIntel.topRisingIssue
          ? `${policyIntel.topRisingIssue.topic} (${policyIntel.topRisingIssue.percentIncrease}%)`
          : "n/a"
      }`,
    )
    console.log(
      `    • Sentiment shift: ${policyIntel.sentimentShift?.netChange?.toFixed(2)}%`,
    )
    console.log(`    • Urgent cases: ${policyIntel.urgentCases.count}`)
  } catch (error) {
    console.error("  Failed to load policy intelligence:", error)
  }
}

main()
  .then(() => {
    console.log("\nAnalytics test complete.")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Analytics test failed:", error)
    process.exit(1)
  })
/**
 * Test script to verify policy intelligence calculations
 * 
 * Usage: npx tsx scripts/test-analytics.ts
 * 
 * This will:
 * 1. Verify database connection
 * 2. Test each analytics function
 * 3. Display sample results
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import { Pool } from "pg"

// Load .env.local file FIRST (before importing anything that uses it)
try {
  const envPath = resolve(process.cwd(), ".env.local")
  const envFile = readFileSync(envPath, "utf-8")
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
  console.log(`✅ Loaded .env.local`)
  console.log(`   DATABASE_URL present: ${!!process.env.DATABASE_URL}`)
  if (process.env.DATABASE_URL) {
    // Show first 30 chars to verify it's correct
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 40)}...`)
  }
} catch (error) {
  console.warn("⚠️  Could not load .env.local file. Make sure DATABASE_URL is set.")
  console.error(error)
}

// NOW import modules that use DATABASE_URL
import {
  getNewMessagesToday,
  getTopRisingIssue,
  getSentimentShift,
  getUrgentCases,
} from "../lib/dashboard-analytics"

// Create a direct pool for testing (bypass the cached one in lib/db.ts)
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false
  }
})

async function query(sql: string, params?: any[]) {
  return testPool.query(sql, params)
}

async function testAnalytics() {
  console.log("\n🧪 Testing Policy Intelligence Analytics\n")
  console.log("=".repeat(60))

  try {
    // Step 1: Get a test tenant
    console.log("\n1️⃣  Finding test tenant...")
    const tenantResult = await query(`SELECT id, name FROM tenants LIMIT 1`)

    if (tenantResult.rows.length === 0) {
      console.error("❌ No tenants found in database")
      return
    }

    const tenantId = tenantResult.rows[0].id
    const tenantName = tenantResult.rows[0].name
    console.log(`✅ Using tenant: ${tenantName} (${tenantId})`)

    // Step 2: Check message count
    console.log("\n2️⃣  Checking message data...")
    const messageCount = await query(
      `SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1`,
      [tenantId]
    )
    const total = parseInt(messageCount.rows[0].count)
    console.log(`   Total messages: ${total}`)

    const analyzedCount = await query(
      `SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1 AND analyzed_at IS NOT NULL`,
      [tenantId]
    )
    const analyzed = parseInt(analyzedCount.rows[0].count)
    console.log(`   Analyzed messages: ${analyzed}`)
    console.log(`   Analysis coverage: ${total > 0 ? Math.round((analyzed / total) * 100) : 0}%`)

    if (analyzed === 0) {
      console.log("\n⚠️  Warning: No messages have been analyzed yet")
      console.log("   Run: npx tsx scripts/analyze-messages.ts")
    }

    // Step 3: Test individual functions
    console.log("\n3️⃣  Testing analytics functions...")

    console.log("\n   📧 New Messages Today:")
    const newMessages = await getNewMessagesToday(tenantId)
    console.log(`      Count: ${newMessages.count}`)
    console.log(`      Change: ${newMessages.percentChange > 0 ? "+" : ""}${newMessages.percentChange}%`)

    console.log("\n   📈 Top Rising Issue:")
    const risingIssue = await getTopRisingIssue(tenantId)
    if (risingIssue) {
      console.log(`      Topic: ${risingIssue.topic}`)
      console.log(`      Increase: +${risingIssue.percentIncrease}%`)
      console.log(`      Count: ${risingIssue.count}`)
    } else {
      console.log("      No significant trends yet")
    }

    console.log("\n   😊 Sentiment Shift:")
    const sentiment = await getSentimentShift(tenantId)
    if (sentiment) {
      console.log(`      Topic: ${sentiment.topic}`)
      console.log(`      Change: ${sentiment.netChange > 0 ? "+" : ""}${sentiment.netChange.toFixed(2)}`)
      console.log(`      Current: ${sentiment.currentScore.toFixed(2)}`)
    } else {
      console.log("      Not enough data yet")
    }

    console.log("\n   🚨 Urgent Cases:")
    const urgent = await getUrgentCases(tenantId)
    console.log(`      Count: ${urgent.count}`)
    if (urgent.preview.length > 0) {
      urgent.preview.forEach((preview, i) => {
        console.log(`      ${i + 1}. ${preview}`)
      })
    } else {
      console.log("      No urgent cases")
    }

    // Step 4: Test combined function
    console.log("\n4️⃣  Testing combined analytics...")
    const startTime = Date.now()
    const policyIntelligence = await getPolicyIntelligence(tenantId)
    const duration = Date.now() - startTime
    console.log(`✅ Loaded all metrics in ${duration}ms`)

    // Step 5: Verify data quality
    console.log("\n5️⃣  Data quality checks...")

    const checks = [
      {
        name: "Messages have dates",
        query: `SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1 AND internal_date IS NULL`,
        expected: 0,
      },
      {
        name: "Messages linked to threads",
        query: `SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1 AND thread_id IS NULL`,
        expected: 0,
      },
      {
        name: "Threads linked to topics",
        query: `SELECT COUNT(*) as count FROM threads WHERE tenant_id = $1 AND topic_id IS NULL`,
        expected: "warning", // Not all threads need topics
      },
    ]

    for (const check of checks) {
      const result = await query(check.query, [tenantId])
      const count = parseInt(result.rows[0].count)

      if (check.expected === 0) {
        if (count === 0) {
          console.log(`   ✅ ${check.name}`)
        } else {
          console.log(`   ❌ ${check.name}: ${count} issues found`)
        }
      } else if (check.expected === "warning") {
        if (count > 0) {
          console.log(`   ⚠️  ${check.name}: ${count} items (may need attention)`)
        } else {
          console.log(`   ✅ ${check.name}`)
        }
      }
    }

    console.log("\n" + "=".repeat(60))
    console.log("✨ Testing complete!\n")

    // Summary
    console.log("📊 Summary:")
    console.log(`   - ${total} total messages`)
    console.log(`   - ${analyzed} analyzed (${total > 0 ? Math.round((analyzed / total) * 100) : 0}%)`)
    console.log(`   - ${policyIntelligence.newMessagesToday.count} new today`)
    console.log(`   - ${policyIntelligence.urgentCases.count} urgent cases`)

    if (analyzed < total * 0.5) {
      console.log("\n💡 Tip: Run backfill script to analyze more messages:")
      console.log("   npx tsx scripts/analyze-messages.ts")
    }

    console.log("\n✅ Dashboard ready at /dashboard")
  } catch (error) {
    console.error("\n💥 Test failed:", error)
    throw error
  } finally {
    await testPool.end()
  }
}

// Run tests
testAnalytics()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error)
    process.exit(1)
  })
