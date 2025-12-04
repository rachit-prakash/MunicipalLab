import { query } from "./db"

export type NewMessagesToday = {
  count: number
  percentChange: number
}

export type TopRisingIssue = {
  topic: string
  percentIncrease: number
  count: number
}

export type SentimentShift = {
  topic: string
  netChange: number
  currentScore: number
}

export type UrgentCase = {
  id: string
  subject: string
  urgency_level: string
  urgency_reasons: string[]
}

export type UrgentCases = {
  count: number
  preview: string[]
  cases: UrgentCase[]
}

export type PolicyIntelligence = {
  newMessagesToday: NewMessagesToday
  topRisingIssue: TopRisingIssue | null
  sentimentShift: SentimentShift | null
  urgentCases: UrgentCases
}

/**
 * Get count of new messages today vs same day last week
 */
export async function getNewMessagesToday(tenantId: string, timezone: string = 'UTC'): Promise<NewMessagesToday> {
  try {
    // Get today's messages (only inbound - messages received, not sent)
    const todayResult = await query(
      `
      SELECT COUNT(*) as count
      FROM messages
      WHERE tenant_id = $1
        AND is_outbound = false
        AND internal_date >= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date
        AND internal_date < (CURRENT_TIMESTAMP AT TIME ZONE $2)::date + INTERVAL '1 day'
      `,
      [tenantId, timezone]
    )

    // Get same day last week
    const lastWeekResult = await query(
      `
      SELECT COUNT(*) as count
      FROM messages
      WHERE tenant_id = $1
        AND is_outbound = false
        AND internal_date >= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date - INTERVAL '7 days'
        AND internal_date < (CURRENT_TIMESTAMP AT TIME ZONE $2)::date - INTERVAL '6 days'
      `,
      [tenantId, timezone]
    )

    const todayCount = parseInt(todayResult.rows[0]?.count || "0")
    const lastWeekCount = parseInt(lastWeekResult.rows[0]?.count || "0")

    const percentChange =
      lastWeekCount > 0 ? Math.round(((todayCount - lastWeekCount) / lastWeekCount) * 100) : 0

    return {
      count: todayCount,
      percentChange,
    }
  } catch (error) {
    console.error("Error getting new messages today:", error)
    return { count: 0, percentChange: 0 }
  }
}

/**
 * Get top rising issue by comparing last 7 days vs previous 7 days
 */
export async function getTopRisingIssue(tenantId: string, timezone: string = 'UTC'): Promise<TopRisingIssue | null> {
  try {
    const result = await query(
      `
      WITH recent_topics AS (
        SELECT 
          t.name as topic,
          COUNT(*) as recent_count
        FROM messages m
        JOIN threads th ON m.thread_id = th.id
        JOIN topics t ON th.topic_id = t.id
        WHERE m.tenant_id = $1
          AND m.internal_date >= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date - INTERVAL '7 days'
        GROUP BY t.name
      ),
      previous_topics AS (
        SELECT 
          t.name as topic,
          COUNT(*) as previous_count
        FROM messages m
        JOIN threads th ON m.thread_id = th.id
        JOIN topics t ON th.topic_id = t.id
        WHERE m.tenant_id = $1
          AND m.internal_date >= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date - INTERVAL '14 days'
          AND m.internal_date < (CURRENT_TIMESTAMP AT TIME ZONE $2)::date - INTERVAL '7 days'
        GROUP BY t.name
      )
      SELECT 
        COALESCE(r.topic, p.topic) as topic,
        COALESCE(r.recent_count, 0) as recent_count,
        COALESCE(p.previous_count, 0) as previous_count,
        CASE 
          WHEN COALESCE(p.previous_count, 0) > 0 THEN
            ROUND(((COALESCE(r.recent_count, 0)::numeric - p.previous_count) / p.previous_count * 100)::numeric, 0)
          WHEN COALESCE(r.recent_count, 0) > 0 THEN 999
          ELSE 0
        END as percent_increase
      FROM recent_topics r
      FULL OUTER JOIN previous_topics p ON r.topic = p.topic
      WHERE COALESCE(r.recent_count, 0) > 0
      ORDER BY percent_increase DESC, recent_count DESC
      LIMIT 1
      `,
      [tenantId, timezone]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      topic: row.topic,
      percentIncrease: parseInt(row.percent_increase),
      count: parseInt(row.recent_count),
    }
  } catch (error) {
    console.error("Error getting top rising issue:", error)
    return null
  }
}

/**
 * Get sentiment shift by comparing this week vs last week
 */
export async function getSentimentShift(tenantId: string, timezone: string = 'UTC'): Promise<SentimentShift | null> {
  try {
    const result = await query(
      `
      WITH recent_sentiment AS (
        SELECT 
          t.name as topic,
          AVG(m.sentiment_score) as avg_sentiment
        FROM messages m
        JOIN threads th ON m.thread_id = th.id
        JOIN topics t ON th.topic_id = t.id
        WHERE m.tenant_id = $1
          AND m.internal_date >= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date - INTERVAL '7 days'
          AND m.sentiment_score IS NOT NULL
        GROUP BY t.name
        HAVING COUNT(*) >= 3
      ),
      previous_sentiment AS (
        SELECT 
          t.name as topic,
          AVG(m.sentiment_score) as avg_sentiment
        FROM messages m
        JOIN threads th ON m.thread_id = th.id
        JOIN topics t ON th.topic_id = t.id
        WHERE m.tenant_id = $1
          AND m.internal_date >= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date - INTERVAL '14 days'
          AND m.internal_date < (CURRENT_TIMESTAMP AT TIME ZONE $2)::date - INTERVAL '7 days'
          AND m.sentiment_score IS NOT NULL
        GROUP BY t.name
        HAVING COUNT(*) >= 3
      )
      SELECT 
        r.topic,
        r.avg_sentiment as current_score,
        ROUND((r.avg_sentiment - COALESCE(p.avg_sentiment, 0))::numeric, 2) as net_change
      FROM recent_sentiment r
      LEFT JOIN previous_sentiment p ON r.topic = p.topic
      ORDER BY net_change ASC
      LIMIT 1
      `,
      [tenantId, timezone]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      topic: row.topic,
      netChange: parseFloat(row.net_change),
      currentScore: parseFloat(row.current_score),
    }
  } catch (error) {
    console.error("Error getting sentiment shift:", error)
    return null
  }
}

/**
 * Get urgent cases from last 48 hours
 */
export async function getUrgentCases(tenantId: string): Promise<UrgentCases> {
  try {
    const result = await query(
      `
      SELECT 
        m.id,
        th.subject,
        m.urgency_level,
        m.urgency_reasons,
        m.internal_date
      FROM messages m
      JOIN threads th ON m.thread_id = th.id
      WHERE m.tenant_id = $1
        AND m.urgency_level IN ('high', 'critical')
        AND m.internal_date >= NOW() - INTERVAL '48 hours'
      ORDER BY 
        CASE m.urgency_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          ELSE 3
        END,
        m.internal_date DESC
      LIMIT 10
      `,
      [tenantId]
    )

    const cases: UrgentCase[] = result.rows.map((row) => ({
      id: row.id,
      subject: row.subject || "No subject",
      urgency_level: row.urgency_level,
      urgency_reasons: row.urgency_reasons || [],
    }))

    const preview = cases.slice(0, 3).map((c) => {
      const reasons = c.urgency_reasons.length > 0 ? ` (${c.urgency_reasons.join(", ")})` : ""
      return `${c.subject.substring(0, 50)}${reasons}`
    })

    return {
      count: cases.length,
      preview,
      cases,
      
    }
  } catch (error) {
    console.error("Error getting urgent cases:", error)
    return { count: 0, preview: [], cases: [] }
  }
}

/**
 * Get all policy intelligence metrics in one call
 */
export async function getPolicyIntelligence(tenantId: string, timezone: string = 'UTC'): Promise<PolicyIntelligence> {
  const [newMessagesToday, topRisingIssue, sentimentShift, urgentCases] = await Promise.all([
    getNewMessagesToday(tenantId, timezone),
    getTopRisingIssue(tenantId, timezone),
    getSentimentShift(tenantId, timezone),
    getUrgentCases(tenantId),
  ])

  return {
    newMessagesToday,
    topRisingIssue,
    sentimentShift,
    urgentCases,
  }
}
