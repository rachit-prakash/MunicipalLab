import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query, withTenant } from "@/lib/db"
import { checkRateLimit, RateLimits } from "@/lib/rateLimit"

type PolicyInsightsResponse = {
  newMessagesToday: {
    count: number
    baselineAvg: number
    deltaPercent: number
  }
  topRisingIssue: {
    topic: string
    deltaPercent: number
    exampleSubjectLine?: string | null
  } | null
  sentimentShift: {
    deltaPercent: number
    thisWeekAvg: number | null
    lastWeekAvg: number | null
  }
  urgentCases: {
    count: number
    topReasons: string[]
  }
}

function calculateDelta(current: number, baseline: number): number {
  if (baseline === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - baseline) / baseline) * 100
}

export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = await checkRateLimit(request, RateLimits.POLICY_INTELLIGENCE)
  if (rateLimitResponse) {
    return rateLimitResponse
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

    const payload = await withTenant(tenantId, async (client) => {
      const timezoneResult = await client.query<{ timezone: string | null }>(
        `SELECT timezone FROM users WHERE id = $1 LIMIT 1`,
        [userId],
      )
      const timezone = timezoneResult.rows[0]?.timezone || "America/New_York"

      const newMessagesTodayPromise = client.query<{ count: string }>(
        `
          WITH bounds AS (
            SELECT date_trunc('day', timezone($1, now())) AS today_local
          )
          SELECT COUNT(*)::int AS count
          FROM messages m
          CROSS JOIN bounds
          WHERE m.is_outbound = false
            AND m.tenant_id = $2
            AND timezone($1, m.internal_date) >= bounds.today_local
            AND timezone($1, m.internal_date) < bounds.today_local + interval '1 day';
        `,
        [timezone, tenantId],
      )

      const baselineAvgPromise = client.query<{ avg_count: string | null }>(
        `
          WITH bounds AS (
            SELECT date_trunc('day', timezone($1, now())) AS today_local
          ),
          series AS (
            SELECT generate_series(1, 7) AS offset
          ),
          daily AS (
            SELECT
              series.offset,
              COUNT(m.id)::int AS day_count
            FROM bounds
            CROSS JOIN series
            LEFT JOIN messages m
              ON m.is_outbound = false
             AND m.tenant_id = $2
            AND timezone($1, m.internal_date) >= bounds.today_local - series.offset * interval '1 day'
            AND timezone($1, m.internal_date) < bounds.today_local - (series.offset - 1) * interval '1 day'
            GROUP BY series.offset
          )
          SELECT COALESCE(AVG(day_count)::float, 0) AS avg_count FROM daily;
        `,
        [timezone, tenantId],
      )

      const topIssuePromise = client.query<{
        topic_name: string
        current_count: string
        prev_count: string
        example_subject: string | null
      }>(
        `
          WITH bounds AS (
            SELECT
              (date_trunc('week', timezone($1, now())) AT TIME ZONE $1) AS this_week_start,
              ((date_trunc('week', timezone($1, now())) + interval '7 day') AT TIME ZONE $1) AS this_week_end,
              ((date_trunc('week', timezone($1, now())) - interval '7 day') AT TIME ZONE $1) AS last_week_start,
              (date_trunc('week', timezone($1, now())) AT TIME ZONE $1) AS last_week_end
          )
          SELECT topic_name, current_count, prev_count, example_subject
          FROM (
            SELECT
              COALESCE(tp.name, 'Uncategorized') AS topic_name,
              COUNT(*) FILTER (
                WHERE timezone($1, m.internal_date) >= bounds.this_week_start
                  AND timezone($1, m.internal_date) < bounds.this_week_end
              ) AS current_count,
              COUNT(*) FILTER (
                WHERE timezone($1, m.internal_date) >= bounds.last_week_start
                  AND timezone($1, m.internal_date) < bounds.last_week_end
              ) AS prev_count,
              MAX(t.subject) FILTER (
            WHERE timezone($1, m.internal_date) >= bounds.this_week_start
                AND timezone($1, m.internal_date) < bounds.this_week_end
              ) AS example_subject
            FROM bounds
            JOIN messages m ON m.tenant_id = $2 AND m.is_outbound = false
            LEFT JOIN threads t ON t.id = m.thread_id
            LEFT JOIN topics tp ON tp.id = t.topic_id
            GROUP BY topic_name
          ) stats
          WHERE current_count > 0 OR prev_count > 0
          ORDER BY
            CASE
              WHEN prev_count = 0 THEN CASE WHEN current_count > 0 THEN 999999 ELSE 0 END
              ELSE (current_count - prev_count)::float / NULLIF(prev_count, 0)
            END DESC,
            current_count DESC
          LIMIT 1;
        `,
        [timezone, tenantId],
      )

      const sentimentPromise = client.query<{
        current_avg: string | null
        prev_avg: string | null
      }>(
        `
          WITH bounds AS (
            SELECT
              (date_trunc('week', timezone($1, now())) AT TIME ZONE $1) AS this_week_start,
              ((date_trunc('week', timezone($1, now())) + interval '7 day') AT TIME ZONE $1) AS this_week_end,
              ((date_trunc('week', timezone($1, now())) - interval '7 day') AT TIME ZONE $1) AS last_week_start,
              (date_trunc('week', timezone($1, now())) AT TIME ZONE $1) AS last_week_end
          )
          SELECT
            AVG(m.sentiment_score) FILTER (
              WHERE m.internal_date >= bounds.this_week_start
                AND m.internal_date < bounds.this_week_end
            ) AS current_avg,
            AVG(m.sentiment_score) FILTER (
            WHERE timezone($1, m.internal_date) >= bounds.last_week_start
                AND timezone($1, m.internal_date) < bounds.last_week_end
            ) AS prev_avg
          FROM bounds
          JOIN messages m ON m.tenant_id = $2
          WHERE m.is_outbound = false
            AND m.sentiment_score IS NOT NULL;
        `,
        [timezone, tenantId],
      )

      const urgentPromise = client.query<{
        count: string
        top_reasons: string[] | null
      }>(
        `
          WITH bounds AS (
            SELECT
              (date_trunc('week', timezone($1, now())) AT TIME ZONE $1) AS this_week_start,
              ((date_trunc('week', timezone($1, now())) + interval '7 day') AT TIME ZONE $1) AS this_week_end
          ),
          urgent_messages AS (
            SELECT m.*
            FROM bounds
            JOIN messages m
              ON m.tenant_id = $2
             AND m.is_outbound = false
             AND m.urgency_level IN ('high', 'critical')
             AND timezone($1, m.internal_date) >= bounds.this_week_start
             AND timezone($1, m.internal_date) < bounds.this_week_end
          )
          SELECT
            (SELECT COUNT(*) FROM urgent_messages)::int AS count,
            COALESCE(
              (
                SELECT array_agg(reason ORDER BY freq DESC)
                FROM (
                  SELECT reason, COUNT(*) AS freq
                  FROM (
                    SELECT unnest(urgency_reasons) AS reason
                    FROM urgent_messages
                    WHERE urgency_reasons IS NOT NULL
                  ) flat
                  GROUP BY reason
                  ORDER BY freq DESC, reason ASC
                  LIMIT 3
                ) reason_counts
              ),
              ARRAY[]::text[]
            ) AS top_reasons;
        `,
        [timezone, tenantId],
      )

      const [todayRow, baselineRow, topIssueRow, sentimentRow, urgentRow] = await Promise.all([
        newMessagesTodayPromise,
        baselineAvgPromise,
        topIssuePromise,
        sentimentPromise,
        urgentPromise,
      ])

      const todayCount = Number(todayRow.rows[0]?.count ?? 0)
      const baselineAvg = Number(baselineRow.rows[0]?.avg_count ?? 0)
      const newMessagesDelta = calculateDelta(todayCount, baselineAvg)

      const topIssue = topIssueRow.rows[0]
        ? {
            topic: topIssueRow.rows[0].topic_name,
            deltaPercent: calculateDelta(
              Number(topIssueRow.rows[0].current_count ?? 0),
              Number(topIssueRow.rows[0].prev_count ?? 0),
            ),
            exampleSubjectLine: topIssueRow.rows[0].example_subject,
          }
        : null

      const currentSentiment = sentimentRow.rows[0]?.current_avg
        ? Number(sentimentRow.rows[0].current_avg)
        : null
      const lastSentiment = sentimentRow.rows[0]?.prev_avg
        ? Number(sentimentRow.rows[0].prev_avg)
        : null

      const sentimentDelta =
        currentSentiment !== null && lastSentiment !== null
          ? calculateDelta(currentSentiment, lastSentiment)
          : 0

      const urgentCount = Number(urgentRow.rows[0]?.count ?? 0)
      const urgentReasons = urgentRow.rows[0]?.top_reasons ?? []

      const response: PolicyInsightsResponse = {
        newMessagesToday: {
          count: todayCount,
          baselineAvg,
          deltaPercent: newMessagesDelta,
        },
        topRisingIssue: topIssue,
        sentimentShift: {
          deltaPercent: sentimentDelta,
          thisWeekAvg: currentSentiment,
          lastWeekAvg: lastSentiment,
        },
        urgentCases: {
          count: urgentCount,
          topReasons: urgentReasons,
        },
      }

      return response
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error fetching policy intelligence", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


