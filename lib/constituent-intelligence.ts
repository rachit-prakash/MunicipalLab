/**
 * Constituent Intelligence Engine
 * Builds relationship memory profiles from email interactions
 */

import { Pool } from "pg"

export interface ConstituentProfile {
  id: string
  email: string
  name?: string
  photoUrl?: string

  // Aggregate stats
  totalEmails: number
  totalCasework: number
  totalCorrespondence: number
  firstContact?: string
  lastContact?: string

  // Sentiment
  avgSentiment?: number
  sentimentTrend?: "improving" | "declining" | "stable"
  sentimentHistory?: Array<{ date: string; sentiment: number }>

  // Topics
  topTopics?: Array<{ topic: string; count: number; lastMentioned: string }>

  // Insights
  keyPhrases?: string[]
  stanceHistory?: Record<string, { support: number; oppose: number; neutral: number }>

  // Patterns
  avgResponseTime?: string
  typicalEmailDays?: number[]
  typicalEmailHours?: number[]
  urgencyProfile?: "usually_urgent" | "usually_calm" | "mixed"

  lastAnalyzedAt?: string
}

interface RawProfile {
  id: string
  email: string
  name: string | null
  photo_url: string | null
  total_emails: number
  total_casework: number
  total_correspondence: number
  first_contact: Date | null
  last_contact: Date | null
  avg_sentiment: number | null
  sentiment_trend: string | null
  sentiment_history: any
  top_topics: any
  key_phrases: string[] | null
  stance_history: any
  avg_response_time: any
  typical_email_days: number[] | null
  typical_email_hours: number[] | null
  urgency_profile: string | null
  last_analyzed_at: Date | null
}

function transformProfile(raw: RawProfile): ConstituentProfile {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name || undefined,
    photoUrl: raw.photo_url || undefined,
    totalEmails: raw.total_emails,
    totalCasework: raw.total_casework,
    totalCorrespondence: raw.total_correspondence,
    firstContact: raw.first_contact?.toISOString(),
    lastContact: raw.last_contact?.toISOString(),
    avgSentiment: raw.avg_sentiment || undefined,
    sentimentTrend: raw.sentiment_trend as any,
    sentimentHistory: raw.sentiment_history || undefined,
    topTopics: raw.top_topics || undefined,
    keyPhrases: raw.key_phrases || undefined,
    stanceHistory: raw.stance_history || undefined,
    avgResponseTime: raw.avg_response_time?.toString(),
    typicalEmailDays: raw.typical_email_days || undefined,
    typicalEmailHours: raw.typical_email_hours || undefined,
    urgencyProfile: raw.urgency_profile as any,
    lastAnalyzedAt: raw.last_analyzed_at?.toISOString(),
  }
}

/**
 * Fetch constituent profile by email
 */
export async function getConstituentProfile(
  pool: Pool,
  tenantId: string,
  email: string,
): Promise<ConstituentProfile | null> {
  const result = await pool.query<RawProfile>(
    `SELECT * FROM constituent_profiles WHERE tenant_id = $1 AND email = $2`,
    [tenantId, email],
  )

  if (result.rows.length === 0) {
    return null
  }

  return transformProfile(result.rows[0])
}

/**
 * Build or update constituent profile from messages/threads
 * This is the core intelligence engine
 */
export async function buildConstituentProfile(pool: Pool, tenantId: string, email: string): Promise<ConstituentProfile> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // 1. Aggregate basic stats from threads
    const statsQuery = await client.query<{
      total_emails: string
      total_casework: string
      total_correspondence: string
      first_contact: Date
      last_contact: Date
      sender_name: string | null
    }>(
      `
      SELECT
        COUNT(DISTINCT t.id) as total_emails,
        SUM(CASE WHEN t.type = 'CASEWORK' THEN 1 ELSE 0 END) as total_casework,
        SUM(CASE WHEN t.type = 'CORRESPONDENCE' THEN 1 ELSE 0 END) as total_correspondence,
        MIN(t.last_message_ts) as first_contact,
        MAX(t.last_message_ts) as last_contact,
        MAX(
          CASE
            WHEN m.from_email = $2 THEN
              CASE
                WHEN m.from_email LIKE '%<%>%' THEN
                  SUBSTRING(m.from_email FROM '^"?([^"<]+)"?\\s*<')
                ELSE NULL
              END
          END
        ) as sender_name
      FROM threads t
      LEFT JOIN messages m ON m.thread_id = t.id AND m.from_email = $2
      WHERE t.tenant_id = $1 AND t.sender_email = $2
      `,
      [tenantId, email],
    )

    const stats = statsQuery.rows[0]
    if (!stats || parseInt(stats.total_emails) === 0) {
      // No data for this constituent
      await client.query("COMMIT")
      return {
        id: "",
        email,
        totalEmails: 0,
        totalCasework: 0,
        totalCorrespondence: 0,
      }
    }

    // 2. Calculate sentiment metrics
    const sentimentQuery = await client.query<{
      avg_sentiment: number | null
      sentiment_points: any
    }>(
      `
      SELECT
        AVG(m.sentiment_score) as avg_sentiment,
        json_agg(
          json_build_object(
            'date', DATE(m.internal_date),
            'sentiment', m.sentiment_score
          ) ORDER BY m.internal_date ASC
        ) FILTER (WHERE m.sentiment_score IS NOT NULL) as sentiment_points
      FROM messages m
      JOIN threads t ON t.id = m.thread_id
      WHERE t.tenant_id = $1 AND t.sender_email = $2 AND m.sentiment_score IS NOT NULL
      `,
      [tenantId, email],
    )

    const sentiment = sentimentQuery.rows[0]
    const sentimentHistory = sentiment?.sentiment_points || []

    // Determine sentiment trend
    let sentimentTrend: "improving" | "declining" | "stable" = "stable"
    if (sentimentHistory.length >= 2) {
      const recentPoints = sentimentHistory.slice(-5)
      const firstAvg =
        recentPoints.slice(0, Math.ceil(recentPoints.length / 2)).reduce((a: number, p: any) => a + (p.sentiment || 0), 0) /
        Math.ceil(recentPoints.length / 2)
      const secondAvg =
        recentPoints.slice(Math.ceil(recentPoints.length / 2)).reduce((a: number, p: any) => a + (p.sentiment || 0), 0) /
        Math.floor(recentPoints.length / 2)

      if (secondAvg - firstAvg > 0.2) sentimentTrend = "improving"
      else if (firstAvg - secondAvg > 0.2) sentimentTrend = "declining"
    }

    // 3. Extract top topics
    const topicsQuery = await client.query<{
      topic: string
      count: string
      last_mentioned: Date
    }>(
      `
      SELECT
        t.topic,
        COUNT(*) as count,
        MAX(t.last_message_ts) as last_mentioned
      FROM threads t
      WHERE t.tenant_id = $1 AND t.sender_email = $2 AND t.topic IS NOT NULL
      GROUP BY t.topic
      ORDER BY count DESC
      LIMIT 5
      `,
      [tenantId, email],
    )

    const topTopics = topicsQuery.rows.map((row) => ({
      topic: row.topic,
      count: parseInt(row.count),
      lastMentioned: row.last_mentioned.toISOString(),
    }))

    // 4. Build stance history
    const stanceQuery = await client.query<{
      topic: string
      stance: string
      count: string
    }>(
      `
      SELECT
        t.topic,
        t.stance,
        COUNT(*) as count
      FROM threads t
      WHERE t.tenant_id = $1 AND t.sender_email = $2 AND t.topic IS NOT NULL AND t.stance IS NOT NULL
      GROUP BY t.topic, t.stance
      `,
      [tenantId, email],
    )

    const stanceHistory: Record<string, { support: number; oppose: number; neutral: number }> = {}
    for (const row of stanceQuery.rows) {
      if (!stanceHistory[row.topic]) {
        stanceHistory[row.topic] = { support: 0, oppose: 0, neutral: 0 }
      }
      const stanceLower = row.stance.toLowerCase()
      if (stanceLower === "support") stanceHistory[row.topic].support = parseInt(row.count)
      else if (stanceLower === "oppose") stanceHistory[row.topic].oppose = parseInt(row.count)
      else stanceHistory[row.topic].neutral = parseInt(row.count)
    }

    // 5. Extract key phrases (simplified - extract from summaries)
    const phrasesQuery = await client.query<{ summary: string }>(
      `
      SELECT t.summary
      FROM threads t
      WHERE t.tenant_id = $1 AND t.sender_email = $2 AND t.summary IS NOT NULL
      ORDER BY t.last_message_ts DESC
      LIMIT 10
      `,
      [tenantId, email],
    )

    // Simple key phrase extraction: look for quoted text and important nouns
    const keyPhrases: string[] = []
    for (const row of phrasesQuery.rows) {
      const matches = row.summary.match(/"([^"]{5,50})"/g) // Extract quoted phrases
      if (matches) {
        keyPhrases.push(...matches.map((m) => m.replace(/"/g, "")))
      }
    }
    const uniquePhrases = Array.from(new Set(keyPhrases)).slice(0, 10)

    // 6. Behavioral patterns - email timing
    const timingQuery = await client.query<{
      email_day: number
      email_hour: number
    }>(
      `
      SELECT
        EXTRACT(DOW FROM m.internal_date)::integer as email_day,
        EXTRACT(HOUR FROM m.internal_date)::integer as email_hour
      FROM messages m
      JOIN threads t ON t.id = m.thread_id
      WHERE t.tenant_id = $1 AND m.from_email = $2
      `,
      [tenantId, email],
    )

    const typicalEmailDays = Array.from(new Set(timingQuery.rows.map((r) => r.email_day)))
    const typicalEmailHours = Array.from(new Set(timingQuery.rows.map((r) => r.email_hour)))

    // 7. Urgency profile
    const urgencyQuery = await client.query<{
      high_urgency_count: string
      total_count: string
    }>(
      `
      SELECT
        SUM(CASE WHEN m.urgency_level IN ('high', 'critical') THEN 1 ELSE 0 END) as high_urgency_count,
        COUNT(*) as total_count
      FROM messages m
      JOIN threads t ON t.id = m.thread_id
      WHERE t.tenant_id = $1 AND m.from_email = $2 AND m.urgency_level IS NOT NULL
      `,
      [tenantId, email],
    )

    const urgency = urgencyQuery.rows[0]
    let urgencyProfile: "usually_urgent" | "usually_calm" | "mixed" = "usually_calm"
    if (urgency && parseInt(urgency.total_count) > 0) {
      const urgencyRate = parseInt(urgency.high_urgency_count) / parseInt(urgency.total_count)
      if (urgencyRate > 0.6) urgencyProfile = "usually_urgent"
      else if (urgencyRate > 0.2) urgencyProfile = "mixed"
    }

    // 8. Upsert profile
    const upsertResult = await client.query<RawProfile>(
      `
      INSERT INTO constituent_profiles (
        tenant_id, email, name,
        total_emails, total_casework, total_correspondence,
        first_contact, last_contact,
        avg_sentiment, sentiment_trend, sentiment_history,
        top_topics, key_phrases, stance_history,
        typical_email_days, typical_email_hours, urgency_profile,
        last_analyzed_at
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6,
        $7, $8,
        $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        NOW()
      )
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        name = EXCLUDED.name,
        total_emails = EXCLUDED.total_emails,
        total_casework = EXCLUDED.total_casework,
        total_correspondence = EXCLUDED.total_correspondence,
        first_contact = EXCLUDED.first_contact,
        last_contact = EXCLUDED.last_contact,
        avg_sentiment = EXCLUDED.avg_sentiment,
        sentiment_trend = EXCLUDED.sentiment_trend,
        sentiment_history = EXCLUDED.sentiment_history,
        top_topics = EXCLUDED.top_topics,
        key_phrases = EXCLUDED.key_phrases,
        stance_history = EXCLUDED.stance_history,
        typical_email_days = EXCLUDED.typical_email_days,
        typical_email_hours = EXCLUDED.typical_email_hours,
        urgency_profile = EXCLUDED.urgency_profile,
        last_analyzed_at = EXCLUDED.last_analyzed_at,
        updated_at = NOW()
      RETURNING *
      `,
      [
        tenantId,
        email,
        stats.sender_name,
        parseInt(stats.total_emails),
        parseInt(stats.total_casework),
        parseInt(stats.total_correspondence),
        stats.first_contact,
        stats.last_contact,
        sentiment.avg_sentiment,
        sentimentTrend,
        JSON.stringify(sentimentHistory),
        JSON.stringify(topTopics),
        uniquePhrases,
        JSON.stringify(stanceHistory),
        typicalEmailDays,
        typicalEmailHours,
        urgencyProfile,
      ],
    )

    await client.query("COMMIT")
    return transformProfile(upsertResult.rows[0])
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

/**
 * Batch build profiles for all constituents in a tenant
 */
export async function buildAllConstituentProfiles(pool: Pool, tenantId: string): Promise<number> {
  // Get all unique sender emails
  const result = await pool.query<{ sender_email: string }>(
    `
    SELECT DISTINCT sender_email
    FROM threads
    WHERE tenant_id = $1 AND sender_email IS NOT NULL
    ORDER BY sender_email
    `,
    [tenantId],
  )

  let count = 0
  for (const row of result.rows) {
    try {
      await buildConstituentProfile(pool, tenantId, row.sender_email)
      count++
    } catch (error) {
      console.error(`Failed to build profile for ${row.sender_email}:`, error)
    }
  }

  return count
}
