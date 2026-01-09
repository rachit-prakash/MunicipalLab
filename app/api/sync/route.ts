import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/db"
import { syncAllAccountsForUser } from "@/scripts/sync"
import { checkRateLimit, RateLimits } from "@/lib/rateLimit"

/**
 * Manual sync endpoint - pulls latest emails from Gmail into the database
 * Syncs all connected Gmail accounts for the user
 * GET /api/sync
 */
export async function GET(request: NextRequest) {
  // Check for demo mode first - no-op for demo
  const demoMode = request.cookies.get("demo")?.value === "1"
  if (demoMode) {
    return NextResponse.json({
      success: true,
      message: "Demo mode - sync simulated",
      accountCount: 1,
      timestamp: new Date().toISOString(),
      demo: true,
    })
  }

  // Check rate limit
  const rateLimitResponse = await checkRateLimit(request, RateLimits.SYNC)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId =
      (session.user as any)?.id ||
      (session as any)?.token?.sub ||
      (session.user as any)?.email

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 401 })
    }

    // DEBUG: Log user info
    console.log("🔍 SYNC DEBUG - Session user:", JSON.stringify({
      id: (session.user as any)?.id,
      email: (session.user as any)?.email,
      sub: (session as any)?.token?.sub,
      resolvedUserId: userId
    }))

    // Check if user has any Gmail accounts
    const accountsResult = await query(
      `SELECT COUNT(*) as count FROM gmail_accounts WHERE user_id = $1`,
      [userId]
    )

    const accountCount = parseInt(accountsResult.rows[0]?.count || "0")

    // DEBUG: Log account lookup result
    console.log("🔍 SYNC DEBUG - Gmail accounts found:", accountCount, "for user_id:", userId)

    if (accountCount === 0) {
      return NextResponse.json(
        { error: "No Gmail accounts found. Please sign in with Google first." },
        { status: 404 }
      )
    }

    // DEBUG: Log before sync
    console.log("🔄 SYNC DEBUG - Starting sync for user:", userId)

    // Sync all accounts for this user
    try {
      await syncAllAccountsForUser(userId)
      console.log("✅ SYNC DEBUG - Sync completed successfully for user:", userId)
    } catch (syncError: any) {
      console.error("❌ SYNC DEBUG - Sync failed with error:", syncError?.message || syncError)
      console.error("❌ SYNC DEBUG - Full error:", syncError)
      throw syncError // Re-throw to be caught by outer catch
    }

    // After sync, analyze rising issues
    let risingIssues = null
    try {
      // Get tenant ID for this user
      const tenantResult = await query(
        `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
        [userId]
      )

      if (tenantResult.rows.length > 0) {
        const tenantId = tenantResult.rows[0].tenant_id

        // Import and call the rising issues analysis
        const { analyzeRisingIssues } = await import('./analyze-rising-issues')
        risingIssues = await analyzeRisingIssues(tenantId, userId)
      }
    } catch (error) {
      // Log error but don't fail the sync
      console.error("Failed to analyze rising issues after sync:", error)
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed successfully for ${accountCount} account(s)`,
      accountCount,
      timestamp: new Date().toISOString(),
      risingIssues: risingIssues,
    })
  } catch (error: any) {
    console.error("Sync error:", error)
    return NextResponse.json(
      {
        error: "Sync failed",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for triggering sync (same as GET, but follows REST conventions)
 */
export async function POST(request: NextRequest) {
  console.log("🚀 POST /api/sync called!")

  // Check rate limit
  const rateLimitResponse = await checkRateLimit(request, RateLimits.SYNC)
  if (rateLimitResponse) {
    console.log("⚠️ Rate limit hit - returning early")
    return rateLimitResponse
  }

  return GET(request)
}

