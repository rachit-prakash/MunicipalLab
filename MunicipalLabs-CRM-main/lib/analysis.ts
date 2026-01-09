import { z } from "zod"
import { classifyToFolders, senderTypeToFolders } from "./message-filter"

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

export type SenderType = "person" | "automated" | "uncertain"

export type MessageAnalysis = {
  sentimentScore: number | null
  urgencyLevel: "low" | "medium" | "high" | "critical"
  urgencyReasons: string[]
  topic: string | null
  confidence: number | null
  senderType: SenderType
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
  sender_type: z
    .enum(["person", "automated", "uncertain"])
    .or(z.string())
    .optional(),
})

const SYSTEM_PROMPT = [
  "You are a municipal policy and casework intelligence analyzer for constituent emails.",
  "",
  "Given subject and body text, return ONLY minified JSON with keys:",
  "{ sentiment_score (-1..1), urgency_level (low|medium|high|critical),",
  "urgency_reasons (string array), topic (short title), confidence (0..1),",
  "sender_type (person|automated|uncertain) }.",
  "",
  "For sender_type:",
  "- person = identifiable individual writing personally",
  "- automated = system, bot, team, service, noreply, notifications",
  "- uncertain = unclear origin",
  "",
  "Examples:",
  "- 'John Smith' = person",
  "- 'City Water Department' = automated",
  "- 'notifications@citymail.gov' = automated",
  "- 'noreply@' = automated",
  "- 'support@' = automated",
  "",
  "Use sender name, email address patterns, writing style, and context.",
  "",
  "DOMAIN CONTEXT (IMPORTANT):",
  "This inbox receives MUNICIPAL / CIVIC emails such as:",
  "- potholes, road damage, flooding, sewage, garbage",
  "- street lights, water supply, electricity safety",
  "- traffic hazards, public safety risks",
  "- emergency services complaints",
  "- citizen grievances and casework",
  "- permit applications, zoning questions",
  "",
  "URGENCY RULES (STRICT):",
  "",
  "- CRITICAL:",
  "  Life/death emergencies, suicide risk, active violence,",
  "  severe flooding threatening homes, fire hazards, exposed live wires.",
  "  Extremely rare. Must imply immediate danger.",
  "",
  "- HIGH:",
  "  Time-sensitive municipal issues or safety risks, including:",
  "  - potholes causing accidents",
  "  - open manholes or road collapse",
  "  - flooding, sewage overflow",
  "  - repeated complaints with no action",
  "  - urgent deadlines (<7 days)",
  "  - strong frustration or escalation",
  "  These do NOT require emotional language to qualify.",
  "",
  "- MEDIUM:",
  "  Standard municipal casework needing response:",
  "  - service requests",
  "  - infrastructure issues without immediate danger",
  "  - citizen questions or complaints",
  "",
  "- LOW:",
  "  Non-actionable, informational, or automated messages.",
  "",
  "AUTOMATED EMAIL HANDLING:",
  "- Marketing, newsletters, receipts, confirmations = LOW",
  "- Bot/team/noreply addresses = LOW",
  "- EXCEPTION: government alerts or system notices indicating public safety risk may be HIGH",
  "",
  "IMPORTANT RULES:",
  "- Do NOT downgrade civic safety issues due to calm tone.",
  "- Real people reporting infrastructure or safety problems are never LOW.",
  "- Use null only if information is genuinely missing.",
  "- Respond with JSON ONLY. No explanations.",
].join(" ")

type Provider = "openai" | "openrouter" | "gemini"

const OPENAI_MODEL = process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o-mini"
const OPENROUTER_MODEL =
  process.env.OPENROUTER_ANALYSIS_MODEL ?? "google/gemini-flash-1.5"
const GEMINI_MODEL = process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-flash-lite"

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
      : provider === "gemini"
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
        : "https://openrouter.ai/api/v1/chat/completions"

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  // Gemini uses API key in URL, not header
  if (provider !== "gemini") {
    headers["Authorization"] = `Bearer ${apiKey}`
  }


  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.OPENROUTER_REFERRER ?? "https://legaside.app"
    headers["X-Title"] = "Legaside Message Analyzer"
  }

  // Build request body based on provider
  const body = provider === "gemini"
    ? JSON.stringify({
      contents: [{
        parts: [{ text: `${SYSTEM_PROMPT}\n\n${content}` }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      }
    })
    : JSON.stringify({
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

  // Extract content based on provider response format
  const contentBlock = provider === "gemini"
    ? payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    : payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.delta?.content ??
    ""
  const parsed = parseContent(contentBlock)
  const normalized = ANALYSIS_SCHEMA.safeParse(parsed)

  if (!normalized.success) {
    throw new Error(
      `Analyzer returned malformed payload: ${normalized.error.message}`,
    )
  }

  const { sentiment_score, urgency_level, urgency_reasons, topic, confidence, sender_type } =
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
    senderType: normalizeSenderType(sender_type),
  }
}

function resolveProvider(): { provider: Provider; apiKey: string; model: string } {
  const geminiKey = process.env.GEMINI_API_KEY
  const openAiKey = process.env.OPENAI_API_KEY
  const openRouterKey = process.env.OPENROUTER_API_KEY

  // Priority: Gemini > OpenAI > OpenRouter (Gemini first for testing)
  if (geminiKey) {
    return { provider: "gemini", apiKey: geminiKey, model: GEMINI_MODEL }
  }

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
    "Set GEMINI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY to enable message analysis.",
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

function normalizeSenderType(input: unknown): SenderType {
  const value = String(input ?? "").toLowerCase()
  switch (value) {
    case "person":
    case "automated":
    case "uncertain":
      return value
    default:
      return "uncertain"
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Unified classification function that returns folder IDs
 * Uses AI analysis if available and confident, otherwise falls back to rule-based
 */
export async function classifyMessageToFolders(
  message: MessageForAnalysis
): Promise<string[]> {
  try {
    // Try AI analysis first
    const analysis = await analyzeMessage(message)

    // If AI is confident about sender type, use it
    if (analysis.senderType !== 'uncertain') {
      return senderTypeToFolders(analysis.senderType)
    }

    // AI is uncertain, fall back to rule-based
    return classifyToFolders(
      message.from || '',
      message.subject || undefined,
      message.body || message.snippet || undefined
    )
  } catch (error) {
    // AI analysis failed, use rule-based classification
    console.error('AI classification failed, falling back to rules:', error)
    return classifyToFolders(
      message.from || '',
      message.subject || undefined,
      message.body || message.snippet || undefined
    )
  }
}

/**
 * Synchronous classification using only rule-based logic
 * Use this when you need immediate classification without AI
 */
export function classifyMessageToFoldersSync(
  from: string,
  subject?: string,
  body?: string,
  isOutbound?: boolean
): string[] {
  return classifyToFolders(from, subject, body, isOutbound)
}

/**
 * Generate a concise summary of a message or thread
 * Uses AI to create a 1-2 sentence summary of the key points
 */
export async function generateSummary(
  message: MessageForAnalysis
): Promise<string> {
  const { provider, apiKey, model } = resolveProvider()

  const content = buildContent(message)
  if (!content.trim()) {
    throw new Error("Cannot summarize empty message content.")
  }

  const systemPrompt = "You are a professional email summarizer. Given an email message, generate a concise 1-2 sentence summary that captures the main point or request. Be direct and factual. Return only the summary text, no JSON or extra formatting."

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
    headers["X-Title"] = "Legaside Summary Generator"
  }

  const body = JSON.stringify({
    model,
    temperature: 0.3,
    max_tokens: 100,
    messages: [
      { role: "system", content: systemPrompt },
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
    throw new Error(`Summary generator upstream error (${response.status}): ${detail}`)
  }

  const summary =
    payload?.choices?.[0]?.message?.content?.trim() ??
    payload?.choices?.[0]?.delta?.content?.trim() ??
    ""

  if (!summary) {
    throw new Error("Summary generator returned empty response")
  }

  return summary
}

