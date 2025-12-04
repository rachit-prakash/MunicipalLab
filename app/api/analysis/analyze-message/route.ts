import { NextRequest, NextResponse } from "next/server"
import { analyzeMessage, type MessageAnalysis, type MessageForAnalysis } from "@/lib/analysis"
import { checkRateLimit, RateLimits } from "@/lib/rateLimit"

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = await checkRateLimit(request, RateLimits.ANALYSIS)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const payload = await request.json().catch(() => ({}))
    const message = normalizePayload(payload)
    const analysis = await analyzeMessage(message)
    return NextResponse.json(analysis as MessageAnalysis)
  } catch (error) {
    console.error("analyze-message error:", error)
    return NextResponse.json(
      {
        error: "ANALYSIS_FAILED",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function normalizePayload(body: any): MessageForAnalysis {
  const toValue =
    Array.isArray(body?.to) && body.to.every((item: any) => typeof item === "string")
      ? (body.to as string[])
      : Array.isArray(body?.to)
        ? body.to.map((value: any) => String(value))
        : undefined

  return {
    subject: safeString(body?.subject),
    snippet: safeString(body?.snippet),
    body: safeString(body?.body),
    from: safeString(body?.from),
    to: toValue,
  }
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined
}
