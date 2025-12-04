import { query } from "@/lib/db"

export type TopicCount = {
  topic: string
  count: number
}

export type TrendPoint = {
  date: string
  support: number
  oppose: number
  neutral: number
}

export type TrendsByTopic = Record<string, TrendPoint[]>

export type DashboardDataset = {
  topTopics: TopicCount[]
  trendsByTopic: TrendsByTopic
}

export async function getDashboardDataset(
  tenantId: string,
  days = 30,
  topicLimit = 5,
): Promise<DashboardDataset> {
  const topTopics = await getTopTopics(tenantId, days, topicLimit)
  const trendTopics = topTopics.slice(0, 3).map((t) => t.topic)
  const trendsByTopic = trendTopics.length
    ? await getTrendSeries(tenantId, trendTopics, days)
    : {}

  return { topTopics, trendsByTopic }
}

export async function getTopTopics(
  tenantId: string,
  days = 30,
  limit = 5,
): Promise<TopicCount[]> {
  const { rows } = await query<TopicCount>(
    `SELECT 
        COALESCE(tp.name, 'Uncategorized') AS topic,
        COUNT(m.id)::int AS count
      FROM messages m
      JOIN threads t ON t.id = m.thread_id
      LEFT JOIN topics tp ON tp.id = t.topic_id
      WHERE m.tenant_id = $1
        AND m.is_outbound = false
        AND m.internal_date >= NOW() - ($2 || ' days')::interval
      GROUP BY 1
      ORDER BY count DESC
      LIMIT $3`,
    [tenantId, days.toString(), limit],
  )
  return rows
}

async function getTrendSeries(
  tenantId: string,
  topics: string[],
  days = 30,
): Promise<TrendsByTopic> {
  if (!topics.length) {
    return {}
  }

  const { rows } = await query<{
    topic: string
    day_bucket: string
    support: number
    oppose: number
    neutral: number
  }>(
    `WITH filtered AS (
        SELECT 
          COALESCE(tp.name, 'Uncategorized') AS topic,
          date_trunc('day', timezone('UTC', m.internal_date)) AS day_bucket,
          m.sentiment_score
        FROM messages m
        JOIN threads t ON t.id = m.thread_id
        LEFT JOIN topics tp ON tp.id = t.topic_id
        WHERE m.tenant_id = $1
          AND m.is_outbound = false
          AND m.sentiment_score IS NOT NULL
          AND m.internal_date >= NOW() - ($2 || ' days')::interval
      )
      SELECT 
        topic,
        day_bucket::date,
        SUM(CASE WHEN sentiment_score >= 0.15 THEN 1 ELSE 0 END)::int AS support,
        SUM(CASE WHEN sentiment_score <= -0.15 THEN 1 ELSE 0 END)::int AS oppose,
        SUM(CASE WHEN sentiment_score > -0.15 AND sentiment_score < 0.15 THEN 1 ELSE 0 END)::int AS neutral
      FROM filtered
      WHERE topic = ANY($3)
      GROUP BY topic, day_bucket
      ORDER BY topic, day_bucket`,
    [tenantId, days.toString(), topics],
  )

  const labels = buildDateLabels(days)
  const result: TrendsByTopic = {}

  for (const topic of topics) {
    const map = new Map<string, TrendPoint>()
    for (const label of labels) {
      map.set(label, { date: label, support: 0, oppose: 0, neutral: 0 })
    }

    rows
      .filter((row) => row.topic === topic)
      .forEach((row) => {
        const label = formatDateLabel(new Date(row.day_bucket))
        const point = map.get(label)
        if (point) {
          point.support = row.support
          point.oppose = row.oppose
          point.neutral = row.neutral
        }
      })

    result[topic] = Array.from(map.values())
  }

  return result
}

function buildDateLabels(days: number): string[] {
  const list: string[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    list.push(formatDateLabel(d))
  }
  return list
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

