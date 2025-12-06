import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { pool, query } from "@/lib/db"
import { buildAllConstituentProfiles } from "@/lib/constituent-intelligence"

/**
 * Admin endpoint to trigger profile building
 * POST /api/admin/build-profiles
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id || (session as any).token?.sub

    // Get tenant_id for this user
    const tenantResult = await query(`SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`, [userId])

    if (!tenantResult.rows.length) {
      return NextResponse.json({ error: "No tenant found" }, { status: 404 })
    }

    const tenantId = tenantResult.rows[0].tenant_id

    // Build profiles in the background (don't await)
    buildAllConstituentProfiles(pool, tenantId)
      .then((count) => {
        console.log(`✅ Built ${count} constituent profiles for tenant ${tenantId}`)
      })
      .catch((error) => {
        console.error(`❌ Failed to build profiles for tenant ${tenantId}:`, error)
      })

    return NextResponse.json({
      message: "Profile building started in background",
      status: "processing",
    })
  } catch (error: any) {
    console.error("Build profiles error:", error)
    return NextResponse.json({ error: error.message || "Failed to start profile building" }, { status: 500 })
  }
}
