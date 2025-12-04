import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query, withTenant } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { timezone } = body

    if (!timezone || typeof timezone !== "string") {
      return NextResponse.json({ error: "Invalid timezone" }, { status: 400 })
    }

    // 1. Get tenant ID for the user
    const userRes = await query(
      `SELECT tenant_id, timezone FROM users WHERE id = $1 LIMIT 1`,
      [(session.user as any)?.id ?? (session as any)?.token?.sub]
    )

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { tenant_id: tenantId, timezone: currentTimezone } = userRes.rows[0]

    // Optimization: Don't update if it's already the same
    if (currentTimezone === timezone) {
      return NextResponse.json({ success: true, updated: false })
    }

    // 2. Update timezone with tenant context
    await withTenant(tenantId, async (client) => {
      await client.query(
        `UPDATE users SET timezone = $1, updated_at = NOW() WHERE id = $2`,
        [timezone, (session.user as any)?.id ?? (session as any)?.token?.sub]
      )
    })

    return NextResponse.json({ success: true, updated: true })
  } catch (error) {
    console.error("Error updating timezone:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
