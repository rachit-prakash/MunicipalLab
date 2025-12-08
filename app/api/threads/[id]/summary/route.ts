import { NextRequest, NextResponse } from "next/server"
import { generateSummary, type MessageForAnalysis } from "@/lib/analysis"
import { checkRateLimit, RateLimits } from "@/lib/rateLimit"
import { createClient } from "@/lib/supabase/server"

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
    const supabase = await createClient()

    // Get the thread and its first message
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id, subject, snippet, sender_email")
      .eq("id", threadId)
      .single()

    if (threadError || !thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      )
    }

    // Get the first message for the thread
    const { data: messages } = await supabase
      .from("messages")
      .select("body_redacted, snippet, from_email")
      .eq("thread_id", threadId)
      .eq("is_outbound", false)
      .order("internal_date", { ascending: true })
      .limit(1)

    const firstMessage = messages?.[0]

    // Build message for analysis
    const messageForAnalysis: MessageForAnalysis = {
      subject: thread.subject,
      snippet: thread.snippet || firstMessage?.snippet,
      body: firstMessage?.body_redacted,
      from: thread.sender_email || firstMessage?.from_email,
    }

    // Generate summary
    const summary = await generateSummary(messageForAnalysis)

    // Store summary in database
    const { error: updateError } = await supabase
      .from("threads")
      .update({ summary })
      .eq("id", threadId)

    if (updateError) {
      console.error("Failed to store summary:", updateError)
      return NextResponse.json(
        { error: "Failed to store summary" },
        { status: 500 }
      )
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("generate-summary error:", error)
    return NextResponse.json(
      {
        error: "SUMMARY_GENERATION_FAILED",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
