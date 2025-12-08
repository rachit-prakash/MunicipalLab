import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateSummary, type MessageForAnalysis } from "@/lib/analysis"
import { checkRateLimit, RateLimits } from "@/lib/rateLimit"
import { withTenant, query } from "@/lib/db"

/**
 * POST /api/threads/[id]/summary
 * Generate and store an AI summary for a thread
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check rate limit
  const rateLimitResponse = await checkRateLimit(request, RateLimits.ANALYSIS)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const threadId = params.id

  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id || (session as any).token?.sub

    // Get tenant_id for this user
    const tenantResult = await query(
      `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
      [userId]
    )

    if (!tenantResult.rows.length) {
      return NextResponse.json({ error: "No tenant found" }, { status: 404 })
    }

    const tenantId = tenantResult.rows[0].tenant_id

    // Get the thread and generate summary within tenant context
    const summary = await withTenant(tenantId, async (client) => {
      // Get the thread and its first message
      const threadResult = await client.query(
        `SELECT id, subject, snippet, sender_email FROM threads WHERE id = $1`,
        [threadId]
      )

      if (!threadResult.rows.length) {
        throw new Error("Thread not found")
      }

      const thread = threadResult.rows[0]

      // Get the first message for the thread
      const messageResult = await client.query(
        `SELECT body_redacted, snippet, from_email
         FROM messages
         WHERE thread_id = $1 AND is_outbound = false
         ORDER BY internal_date ASC
         LIMIT 1`,
        [threadId]
      )

      const firstMessage = messageResult.rows[0]

      // Build message for analysis
      const messageForAnalysis: MessageForAnalysis = {
        subject: thread.subject,
        snippet: thread.snippet || firstMessage?.snippet,
        body: firstMessage?.body_redacted,
        from: thread.sender_email || firstMessage?.from_email,
      }

      // Generate summary
      const generatedSummary = await generateSummary(messageForAnalysis)

      // Store summary in database
      await client.query(
        `UPDATE threads SET summary = $1 WHERE id = $2`,
        [generatedSummary, threadId]
      )

      return generatedSummary
    })

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("generate-summary error:", error)

    if (error instanceof Error && error.message === "Thread not found") {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: "SUMMARY_GENERATION_FAILED",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
