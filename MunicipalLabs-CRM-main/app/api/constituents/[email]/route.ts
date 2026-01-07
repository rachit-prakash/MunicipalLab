import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { pool, query } from "@/lib/db"
import { getConstituentProfile, buildConstituentProfile } from "@/lib/constituent-intelligence"
import { checkRateLimit, RateLimits } from "@/lib/rateLimit"

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  // Check rate limit
  const rateLimitResponse = await checkRateLimit(request, RateLimits.GMAIL_THREADS)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

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
    const { email: emailParam } = await params
    const email = decodeURIComponent(emailParam)

    // Check if profile exists
    let profile = await getConstituentProfile(pool, tenantId, email)

    // If profile doesn't exist or is stale (> 24 hours old), rebuild it
    const needsRebuild =
      !profile ||
      !profile.lastAnalyzedAt ||
      new Date().getTime() - new Date(profile.lastAnalyzedAt).getTime() > 24 * 60 * 60 * 1000

    if (needsRebuild) {
      // Build profile in the background, but return existing profile if available
      const rebuildPromise = buildConstituentProfile(pool, tenantId, email)

      if (!profile) {
        // No existing profile, wait for build
        profile = await rebuildPromise
      } else {
        // Return stale profile immediately, rebuild in background
        rebuildPromise.catch((error) => {
          console.error(`Background profile rebuild failed for ${email}:`, error)
        })
      }
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    console.error("Constituent profile fetch error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch constituent profile" }, { status: 500 })
  }
}
