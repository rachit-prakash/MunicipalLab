'use client'

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { InsightCard } from "@/components/dashboard/insight-card"
import { Skeleton } from "@/components/ui/skeleton"

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

function formatDeltaLabel(value: number | null | undefined, suffix: string) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return `No change ${suffix}`
  }
  if (Math.abs(value) < 0.5) {
    return `No change ${suffix}`
  }
  const arrow = value > 0 ? "↑" : "↓"
  return `${arrow} ${Math.abs(Math.round(value))}% ${suffix}`
}

function formatSignedPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0%"
  }
  const rounded = Math.round(value)
  return `${rounded > 0 ? "+" : ""}${rounded}%`
}

export function PolicyIntelligenceHeader() {
  const [data, setData] = useState<PolicyInsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const placeholderCards = useMemo(
    () => [
      {
        key: "messages-placeholder",
        title: "New Messages Today",
        value: "87",
        insight: "↑ 12% vs last week",
      },
      {
        key: "issue-placeholder",
        title: "Top Rising Issue",
        value: "Transit complaints",
        insight: "↑ 34% this week",
      },
      {
        key: "sentiment-placeholder",
        title: "Sentiment Shift",
        value: "-12% net sentiment",
        insight: "Drop driven by public safety emails",
      },
      {
        key: "urgent-placeholder",
        title: "Urgent Cases",
        value: "14 urgent",
        insight: "Mostly angry + emergency keywords",
      },
    ],
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/policy-intelligence", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })
        if (!res.ok) {
          const message = await res.text().catch(() => res.statusText)
          throw new Error(message || "Failed to load insights")
        }
        const payload = (await res.json()) as PolicyInsightsResponse
        setData(payload)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        setError(err?.message ?? "Unable to load insights")
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  const cards = useMemo(() => {
    if (!data) return placeholderCards
    const deltaVsAvg = formatDeltaLabel(data.newMessagesToday.deltaPercent, "vs 7-day avg")
    const risingIssue = data.topRisingIssue
    const risingInsight = risingIssue
      ? formatDeltaLabel(risingIssue.deltaPercent, "week-over-week")
      : "Monitoring all topics"
    const sentimentValue = `${formatSignedPercent(data.sentimentShift.deltaPercent)} net sentiment`
    const sentimentInsight = data.sentimentShift.thisWeekAvg !== null
      ? `This week avg ${Number(data.sentimentShift.thisWeekAvg).toFixed(2)}`
      : "Not enough signal yet"
    const urgentReasons =
      data.urgentCases.topReasons.length > 0
        ? `Mostly ${data.urgentCases.topReasons.slice(0, 2).join(" + ")}`
        : "No critical triggers"

    return [
      {
        key: "messages",
        title: "New Messages Today",
        value: data.newMessagesToday.count,
        insight: deltaVsAvg,
      },
      {
        key: "issue",
        title: "Top Rising Issue",
        value: risingIssue?.topic ?? "No spike detected",
        insight: risingInsight,
        extra: risingIssue?.exampleSubjectLine ? (
          <p className="text-xs text-gray-400">
            e.g. "
            {risingIssue.exampleSubjectLine.length > 70
              ? `${risingIssue.exampleSubjectLine.slice(0, 70)}...`
              : risingIssue.exampleSubjectLine}
            "
          </p>
        ) : null,
      },
      {
        key: "sentiment",
        title: "Sentiment Shift",
        value: sentimentValue,
        insight: sentimentInsight,
      },
      {
        key: "urgent",
        title: "Urgent Cases",
        value: `${data.urgentCases.count} urgent`,
        insight: urgentReasons,
      },
    ]
  }, [data, placeholderCards])

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Policy Intelligence</p>
        <p className="text-base text-gray-600">Decision-grade signals updated live from constituent inboxes</p>
      </div>

      {error ? <div className="text-sm text-red-600 border border-red-100 bg-red-50 rounded-lg px-3 py-2">{error}</div> : null}

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={`insight-skeleton-${idx}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-32 mb-3" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))
          : cards.map((card, idx) => (
              <InsightCard
                key={card.key}
                title={card.title}
                value={card.value}
                insight={card.insight}
                delay={0.05 * idx}
              >
                {card.extra}
              </InsightCard>
            ))}
      </motion.div>
    </section>
  )
}


