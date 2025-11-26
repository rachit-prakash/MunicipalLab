import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/db"
import { runIncrementalSync } from "@/scripts/sync"

/**
 * Manual sync endpoint - pulls latest emails from Gmail into the database
 * GET /api/sync
 */
export async function GET(request: NextRequest) {
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

    // Get tenant ID
    const tenantResult = await query(
      `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
      [userId]
    )

    if (!tenantResult.rows.length) {
      return NextResponse.json(
        { error: "No Gmail account found. Please sign in with Google first." },
        { status: 404 }
      )
    }

    const tenantId = tenantResult.rows[0].tenant_id

    // Run the sync!
    await runIncrementalSync(tenantId, userId)

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      timestamp: new Date().toISOString(),
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
  return GET(request)
}

