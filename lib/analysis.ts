import { z } from "zod"

// basically this is a wrapper around the openai/openrouter api for analyzing messages
// it takes a message and returns a message analysis
// the message analysis is a object with the following properties:
// - sentimentScore: a number between -1 and 1
// - urgencyLevel: a string representing the urgency level of the message
// - urgencyReasons: an array of strings representing the reasons for the urgency level
// - topic: a string representing the topic of the message
// - confidence: a number between 0 and 1 representing the confidence in the analysis

export type MessageForAnalysis = {
  subject?: string | null
  snippet?: string | null
  body?: string | null
  from?: string | null
  to?: string[] | null
}

export type MessageAnalysis = {
  sentimentScore: number | null
  urgencyLevel: "low" | "medium" | "high" | "critical"
  urgencyReasons: string[]
  topic: string | null
  confidence: number | null
}

const ANALYSIS_SCHEMA = z.object({
  sentiment_score: z.coerce.number().min(-1).max(1).nullable().optional(),
  urgency_level: z
    .enum(["low", "medium", "high", "critical"])
    .or(z.string())
    .optional(),
  urgency_reasons: z.array(z.string().min(1)).optional(),
  topic: z.string().min(2).max(120).optional(),
  confidence: z.coerce.number().min(0).max(1).nullable().optional(),
})

const SYSTEM_PROMPT = [
  "You are a policy intelligence analyzer for constituent emails.",
  "Given subject/body text, return ONLY minified JSON with keys:",
  "{ sentiment_score (-1..1), urgency_level (low|medium|high|critical),",
  "urgency_reasons (string array), topic (short title), confidence (0..1) }.",
  "Respond with JSON only. Use null for unknown values.",
].join(" ")

type Provider = "openai" | "openrouter"

const OPENAI_MODEL = process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o-mini"
const OPENROUTER_MODEL =
  process.env.OPENROUTER_ANALYSIS_MODEL ?? "google/gemini-flash-1.5"

export async function analyzeMessage(
  message: MessageForAnalysis,
): Promise<MessageAnalysis> {
  const { provider, apiKey, model } = resolveProvider()

  const content = buildContent(message)
  if (!content.trim()) {
    throw new Error("Cannot analyze empty message content.")
  }

  const url =
    provider === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions"

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  }

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.OPENROUTER_REFERRER ?? "https://legaside.app"
    headers["X-Title"] = "Legaside Message Analyzer"
  }

  const body = JSON.stringify({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
  })

  const response = await fetch(url, { method: "POST", headers, body })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const detail =
      typeof payload?.error === "string"
        ? payload.error
        : payload?.error?.message ?? response.statusText
    throw new Error(`Analyzer upstream error (${response.status}): ${detail}`)
  }

  const contentBlock =
    payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.delta?.content ??
    ""
  const parsed = parseContent(contentBlock)
  const normalized = ANALYSIS_SCHEMA.safeParse(parsed)

  if (!normalized.success) {
    throw new Error(
      `Analyzer returned malformed payload: ${normalized.error.message}`,
    )
  }

  const { sentiment_score, urgency_level, urgency_reasons, topic, confidence } =
    normalized.data

  return {
    sentimentScore:
      typeof sentiment_score === "number"
        ? clamp(sentiment_score, -1, 1)
        : null,
    urgencyLevel: normalizeUrgencyLevel(urgency_level),
    urgencyReasons:
      urgency_reasons?.map((reason) => reason.trim()).filter(Boolean) ?? [],
    topic: topic?.trim() || null,
    confidence:
      typeof confidence === "number" ? clamp(confidence, 0, 1) : null,
  }
}

function resolveProvider(): { provider: Provider; apiKey: string; model: string } {
  const openAiKey = process.env.OPENAI_API_KEY
  const openRouterKey = process.env.OPENROUTER_API_KEY

  if (openAiKey) {
    return { provider: "openai", apiKey: openAiKey, model: OPENAI_MODEL }
  }

  if (openRouterKey) {
    return {
      provider: "openrouter",
      apiKey: openRouterKey,
      model: OPENROUTER_MODEL,
    }
  }

  throw new Error(
    "Set OPENAI_API_KEY or OPENROUTER_API_KEY to enable message analysis.",
  )
}

function buildContent(message: MessageForAnalysis): string {
  const lines: string[] = []
  if (message.subject) lines.push(`Subject: ${message.subject}`)
  if (message.from) lines.push(`From: ${message.from}`)
  if (message.to?.length) lines.push(`To: ${message.to.join(", ")}`)
  if (message.snippet) lines.push(`Snippet:\n${message.snippet}`)
  if (message.body) lines.push(`Body:\n${message.body}`)
  return lines.join("\n\n")
}

function parseContent(content: string): unknown {
  const trimmed = content?.trim() ?? ""
  if (!trimmed) return {}
  const direct = safeJson(trimmed)
  if (direct) return direct
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start >= 0 && end > start) {
    return safeJson(trimmed.slice(start, end + 1)) ?? {}
  }
  return {}
}

function safeJson(payload: string): unknown | null {
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

function normalizeUrgencyLevel(input: unknown): MessageAnalysis["urgencyLevel"] {
  const value = String(input ?? "").toLowerCase()
  switch (value) {
    case "critical":
    case "high":
    case "medium":
    case "low":
      return value
    default:
      return "low"
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

