import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { runIncrementalSync } from "@/scripts/sync"

/**
 * Cron endpoint for automatic background sync
 * This endpoint syncs all active Gmail accounts
 * 
 * For Vercel: Configured in vercel.json to run every 5 minutes
 * For local/other: Can be called via curl/wget from system cron
 * 
 * Security: Should be protected with CRON_SECRET in production
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret in production (optional but recommended)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret) {
      const providedSecret = authHeader?.replace("Bearer ", "")
      if (providedSecret !== cronSecret) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
    }

    // Get all active Gmail accounts
    const accountsResult = await query(
      `SELECT DISTINCT user_id, tenant_id 
       FROM gmail_accounts 
       WHERE user_id IS NOT NULL 
       AND tenant_id IS NOT NULL
       ORDER BY last_sync_at ASC NULLS FIRST
       LIMIT 50`
    )

    const accounts = accountsResult.rows
    const results = []

    // Sync each account
    for (const account of accounts) {
      try {
        await runIncrementalSync(account.tenant_id, account.user_id)
        results.push({
          userId: account.user_id,
          tenantId: account.tenant_id,
          status: "success",
        })
      } catch (error: any) {
        console.error(
          `Sync failed for user ${account.user_id}:`,
          error.message
        )
        results.push({
          userId: account.user_id,
          tenantId: account.tenant_id,
          status: "error",
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      accountsProcessed: results.length,
      results,
    })
  } catch (error: any) {
    console.error("Cron sync error:", error)
    return NextResponse.json(
      {
        error: "Cron sync failed",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

