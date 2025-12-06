/**
 * Build Constituent Profiles Script
 *
 * This script builds or rebuilds constituent profiles for all constituents
 * in the database. Run this:
 * - After initial migration to populate profiles
 * - Periodically (e.g., nightly) to keep profiles fresh
 * - After bulk email imports
 *
 * Usage:
 *   pnpm tsx scripts/build-constituent-profiles.ts [tenantId]
 *
 * If no tenantId is provided, builds profiles for all tenants.
 */

// Load environment variables from .env.local
import * as fs from "fs"
import * as path from "path"

const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8")
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

import { pool } from "../lib/db"
import { buildAllConstituentProfiles, buildConstituentProfile } from "../lib/constituent-intelligence"

async function main() {
  const args = process.argv.slice(2)
  const targetTenantId = args[0]

  console.log("🚀 Starting constituent profile builder...")

  try {
    if (targetTenantId) {
      // Build profiles for specific tenant
      console.log(`📊 Building profiles for tenant: ${targetTenantId}`)
      const count = await buildAllConstituentProfiles(pool, targetTenantId)
      console.log(`✅ Built ${count} constituent profiles`)
    } else {
      // Build profiles for all tenants
      console.log("📊 Building profiles for all tenants...")

      const tenantResult = await pool.query<{ id: string; name: string }>(
        `SELECT id, name FROM tenants ORDER BY name`,
      )

      let totalCount = 0
      for (const tenant of tenantResult.rows) {
        console.log(`\n📂 Processing tenant: ${tenant.name} (${tenant.id})`)
        try {
          const count = await buildAllConstituentProfiles(pool, tenant.id)
          console.log(`   ✅ Built ${count} profiles`)
          totalCount += count
        } catch (error: any) {
          console.error(`   ❌ Failed: ${error.message}`)
        }
      }

      console.log(`\n🎉 Total: Built ${totalCount} constituent profiles across ${tenantResult.rows.length} tenants`)
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
