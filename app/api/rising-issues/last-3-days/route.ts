import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query, withTenant } from "@/lib/db"
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

type TopicGroup = {
  topic: string
  last3DaysMessages: MessageForAnalysis[]
  previous3DaysMessages: MessageForAnalysis[]
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

  // Prepare message summaries for AI
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

    // Parse the JSON response
    const topicGroups = JSON.parse(content) as Record<string, number[]>

    // Convert message numbers back to actual messages
    const result: Record<string, MessageForAnalysis[]> = {}
    for (const [topic, messageIndices] of Object.entries(topicGroups)) {
      result[topic] = messageIndices
        .map(idx => messages[idx - 1])
        .filter(msg => msg !== undefined)
    }

    return result
  } catch (error) {
    console.error('AI topic analysis failed:', error)
    // Fallback: group by subject keywords
    return fallbackTopicGrouping(messages)
  }
}

function fallbackTopicGrouping(messages: MessageForAnalysis[]): Record<string, MessageForAnalysis[]> {
  // Simple keyword-based fallback
  const groups: Record<string, MessageForAnalysis[]> = {
    'General': []
  }

  for (const msg of messages) {
    const subject = msg.subject.toLowerCase()
    let assigned = false

    if (subject.includes('support') || subject.includes('help') || subject.includes('issue')) {
      groups['Support Issues'] = groups['Support Issues'] || []
      groups['Support Issues'].push(msg)
      assigned = true
    } else if (subject.includes('bill') || subject.includes('payment') || subject.includes('invoice')) {
      groups['Billing'] = groups['Billing'] || []
      groups['Billing'].push(msg)
      assigned = true
    } else if (subject.includes('feature') || subject.includes('request') || subject.includes('suggestion')) {
      groups['Feature Requests'] = groups['Feature Requests'] || []
      groups['Feature Requests'].push(msg)
      assigned = true
    }

    if (!assigned) {
      groups['General'].push(msg)
    }
  }

  return groups
}

export async function GET(request: NextRequest) {
  // Check for demo mode first
  const demoMode = request.cookies.get("demo")?.value === "1"
  if (demoMode) {
    // Return demo rising issues data
    return NextResponse.json({
      topRisingIssue: {
        topic: "Transit complaints",
        last3DaysCount: 45,
        previous3DaysCount: 28,
        deltaPercent: 60.7,
        thisWeekCount: 45,
        lastWeekCount: 28,
        weekOverWeekPercent: 34,
        exampleSubjects: [
          "Bus route 45 delays affecting commuters",
          "Metro system needs improvement",
          "Public transit concerns - District 3"
        ],
      },
      allIssues: [
        {
          topic: "Transit complaints",
          last3DaysCount: 45,
          previous3DaysCount: 28,
          deltaPercent: 60.7,
          thisWeekCount: 45,
          lastWeekCount: 28,
          weekOverWeekPercent: 34,
          exampleSubjects: [
            "Bus route 45 delays affecting commuters",
            "Metro system needs improvement",
            "Public transit concerns - District 3"
          ],
        },
        {
          topic: "Housing affordability",
          last3DaysCount: 32,
          previous3DaysCount: 25,
          deltaPercent: 28,
          thisWeekCount: 32,
          lastWeekCount: 25,
          weekOverWeekPercent: 28,
          exampleSubjects: [
            "Rising rent prices in downtown",
            "Need for affordable housing",
            "Zoning reform request"
          ],
        },
      ],
    })
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId =
      (session.user as any)?.id ||
      (session as any)?.token?.sub ||
      (session.user as any)?.email
    if (!userId) {
      return NextResponse.json({ error: "Missing session user" }, { status: 401 })
    }

    const tenantResult = await query(
      `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
      [userId],
    )

    if (!tenantResult.rows.length) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    const tenantId = tenantResult.rows[0].tenant_id

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

        // For week-over-week, we use the same data (simplified)
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

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching rising issues", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
