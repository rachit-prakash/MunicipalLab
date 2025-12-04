import { NextRequest, NextResponse } from "next/server"
import { analyzeMessage, type MessageForAnalysis } from "@/lib/analysis"

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}))
    const message = normalizePayload(payload)
    const analysis = await analyzeMessage(message)
    return NextResponse.json(analysis)
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
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

type AnalysisResult = {
  sentiment_score: number // -1.0 to 1.0
  urgency_level: "low" | "medium" | "high" | "critical"
  urgency_reasons: string[]
  topic: string | null
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    }

    const body = await req.json().catch(() => ({}))
    const subject = (body?.subject ?? "").trim()
    const snippet = (body?.snippet ?? "").trim()
    const bodyText = (body?.body ?? "").trim()

    if (!subject && !snippet && !bodyText) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      })
    }

    const content = [subject, snippet, bodyText].filter(Boolean).join("\n\n")

    const systemPrompt = `You are a policy intelligence analyst for elected officials. Analyze constituent emails and extract:
1. Sentiment score (-1.0 to 1.0): How positive/negative is the tone?
2. Urgency level (low/medium/high/critical): Does this need immediate attention?
3. Urgency reasons: Array of flags like "deadline", "angry_tone", "emergency_keywords", "legal_threat", "media_mention"
4. Topic: Main policy topic (Healthcare, Immigration, Infrastructure, Education, Environment, Climate, Housing, Transportation, Public Safety, Economy, or null)

Respond ONLY with valid JSON in this exact format:
{
  "sentiment_score": 0.5,
  "urgency_level": "medium",
  "urgency_reasons": ["deadline"],
  "topic": "Healthcare"
}`

    const isOpenRouter = !process.env.OPENAI_API_KEY && !!process.env.OPENROUTER_API_KEY
    const url = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions"

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        ...(isOpenRouter ? { "HTTP-Referer": "https://legaside.app", "X-Title": "Legaside Analysis" } : {}),
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this email:\n\n${content}` },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ error: text || "AI analysis failed" }), {
        status: res.status,
        headers: { "content-type": "application/json" },
      })
    }

    const data = await res.json()
    const aiResponse = data?.choices?.[0]?.message?.content

    if (!aiResponse) {
      return new Response(JSON.stringify({ error: "No AI response" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      })
    }

    let analysis: AnalysisResult
    try {
      const parsed = JSON.parse(aiResponse)
      analysis = {
        sentiment_score: Math.max(-1, Math.min(1, Number(parsed.sentiment_score) || 0)),
        urgency_level: ["low", "medium", "high", "critical"].includes(parsed.urgency_level)
          ? parsed.urgency_level
          : "low",
        urgency_reasons: Array.isArray(parsed.urgency_reasons) ? parsed.urgency_reasons : [],
        topic: parsed.topic || null,
      }
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      })
    }

    return new Response(JSON.stringify(analysis), {
      headers: { "content-type": "application/json" },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Unexpected error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }
}

