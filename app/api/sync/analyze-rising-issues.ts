import { withTenant } from "@/lib/db"
import OpenAI from "openai"

type RisingIssue = {
  topic: string
  last3DaysCount: number
  previous3DaysCount: number
  deltaPercent: number
  thisWeekCount: number
  lastWeekCount: number
  weekOverWeekPercent: number
  exampleSubjects: string[]
}

type MessageForAnalysis = {
  subject: string
  snippet: string
  internal_date: string
  period: 'last_3_days' | 'previous_3_days'
}

function calculateDelta(current: number, baseline: number): number {
  if (baseline === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - baseline) / baseline) * 100
}

async function analyzeTopicsWithAI(messages: MessageForAnalysis[]): Promise<Record<string, MessageForAnalysis[]>> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const messageSummaries = messages.map((msg, idx) =>
    `${idx + 1}. [${msg.period}] "${msg.subject}" - ${msg.snippet.slice(0, 100)}`
  ).join('\n')

  const prompt = `Analyze these email messages and group them into 3-5 common topics or themes. Return ONLY a JSON object where keys are topic names and values are arrays of message numbers (1-indexed).

Messages:
${messageSummaries}

Example response format:
{
  "Technical Support": [1, 3, 5],
  "Billing Issues": [2, 4],
  "Feature Requests": [6, 7, 8]
}

Return only valid JSON, no explanations.`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: prompt
      }],
      response_format: { type: "json_object" }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const topicGroups = JSON.parse(content) as Record<string, number[]>

    const result: Record<string, MessageForAnalysis[]> = {}
    for (const [topic, messageIndices] of Object.entries(topicGroups)) {
      result[topic] = messageIndices
        .map(idx => messages[idx - 1])
        .filter(msg => msg !== undefined)
    }

    return result
  } catch (error) {
    console.error('AI topic analysis failed:', error)
    return { 'General': messages }
  }
}

export async function analyzeRisingIssues(tenantId: string, userId: string) {
  const result = await withTenant(tenantId, async (client) => {
    const timezoneResult = await client.query<{ timezone: string | null }>(
      `SELECT timezone FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    )
    const timezone = timezoneResult.rows[0]?.timezone || "America/New_York"

    // Fetch messages from last 6 days for AI analysis
    const messagesResult = await client.query<{
      subject: string
      snippet: string
      internal_date: string
      period: 'last_3_days' | 'previous_3_days'
    }>(
      `
        WITH time_bounds AS (
          SELECT
            timezone($1, now()) AS now_local,
            timezone($1, now()) - interval '3 days' AS last_3_days_start,
            timezone($1, now()) - interval '6 days' AS previous_3_days_start
        )
        SELECT
          t.subject,
          m.snippet,
          m.internal_date::text,
          CASE
            WHEN m.internal_date >= time_bounds.last_3_days_start THEN 'last_3_days'::text
            ELSE 'previous_3_days'::text
          END as period
        FROM time_bounds
        JOIN messages m ON m.tenant_id = $2 AND m.is_outbound = false
        LEFT JOIN threads t ON t.id = m.thread_id
        WHERE m.internal_date >= time_bounds.previous_3_days_start
          AND m.internal_date < time_bounds.now_local
          AND t.subject IS NOT NULL
        ORDER BY m.internal_date DESC
        LIMIT 100
      `,
      [timezone, tenantId],
    )

    if (messagesResult.rows.length === 0) {
      return {
        topRisingIssue: null,
        allIssues: [],
      }
    }

    // Use AI to group messages by topic
    const messages: MessageForAnalysis[] = messagesResult.rows.map(row => ({
      subject: row.subject,
      snippet: row.snippet,
      internal_date: row.internal_date,
      period: row.period as 'last_3_days' | 'previous_3_days'
    }))

    const topicGroups = await analyzeTopicsWithAI(messages)

    // Calculate statistics for each topic
    const allIssues: RisingIssue[] = []

    for (const [topic, topicMessages] of Object.entries(topicGroups)) {
      const last3DaysMessages = topicMessages.filter(m => m.period === 'last_3_days')
      const previous3DaysMessages = topicMessages.filter(m => m.period === 'previous_3_days')

      const last3DaysCount = last3DaysMessages.length
      const previous3DaysCount = previous3DaysMessages.length

      const thisWeekCount = last3DaysCount
      const lastWeekCount = previous3DaysCount

      const deltaPercent = calculateDelta(last3DaysCount, previous3DaysCount)
      const weekOverWeekPercent = calculateDelta(thisWeekCount, lastWeekCount)

      allIssues.push({
        topic,
        last3DaysCount,
        previous3DaysCount,
        deltaPercent,
        thisWeekCount,
        lastWeekCount,
        weekOverWeekPercent,
        exampleSubjects: last3DaysMessages.slice(0, 3).map(m => m.subject),
      })
    }

    // Sort by week-over-week change
    allIssues.sort((a, b) => {
      if (a.previous3DaysCount === 0 && b.previous3DaysCount === 0) {
        return b.last3DaysCount - a.last3DaysCount
      }
      if (a.previous3DaysCount === 0) return -1
      if (b.previous3DaysCount === 0) return 1
      return b.weekOverWeekPercent - a.weekOverWeekPercent
    })

    const topRisingIssue = allIssues[0] || null

    return {
      topRisingIssue,
      allIssues: allIssues.slice(0, 5), // Return top 5 issues
    }
  })

  return result
}
