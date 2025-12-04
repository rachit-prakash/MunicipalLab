'use client'

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { InsightCard } from "@/components/dashboard/insight-card"
import { Skeleton } from "@/components/ui/skeleton"

type TrendTone = "up" | "down" | "neutral"
type InsightTone = TrendTone | "default"

type InsightCardSpec = {
  key: string
  title: string
  value: string | number
  insight: string
  insightTone?: InsightTone
  extra?: ReactNode
}

const placeholderCards: InsightCardSpec[] = [
  {
    key: "messages-placeholder",
    title: "New Messages Today",
    value: "87",
    insight: "↑ 12% vs last week",
    insightTone: "up",
  },
  {
    key: "issue-placeholder",
    title: "Top Rising Issue",
    value: "Transit complaints",
    insight: "↑ 34% this week",
    insightTone: "up",
  },
  {
    key: "sentiment-placeholder",
    title: "Sentiment Shift",
    value: "-12% net sentiment",
    insight: "Drop driven by public safety emails",
    insightTone: "down",
  },
  {
    key: "urgent-placeholder",
    title: "Urgent Cases",
    value: "14 urgent",
    insight: "Mostly angry + emergency keywords",
    insightTone: "neutral",
  },
]

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

function formatDeltaLabel(value: number | null | undefined, suffix: string): { label: string; tone: TrendTone } {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { label: `No change ${suffix}`, tone: "neutral" }
  }
  if (Math.abs(value) < 0.5) {
    return { label: `No change ${suffix}`, tone: "neutral" }
  }
  const tone: TrendTone = value > 0 ? "up" : "down"
  const arrow = tone === "up" ? "↑" : "↓"
  return { label: `${arrow} ${Math.abs(Math.round(value))}% ${suffix}`, tone }
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
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const loadInsights = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/policy-intelligence", {
          method: "GET",
          cache: "no-store",
          signal,
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
    },
    [],
  )

  const handleSync = useCallback(
    async (options?: { silent?: boolean; signal?: AbortSignal }) => {
      const silent = options?.silent ?? false
      if (!silent) {
        setSyncing(true)
        setSyncMessage(null)
      }
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          cache: "no-store",
        })

        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: "Sync failed" }))
          throw new Error(error.message || error.error || "Failed to sync")
        }

        if (!silent) {
          setSyncMessage("✓ Synced successfully!")
          setTimeout(() => setSyncMessage(null), 3000)
        }

        await loadInsights(options?.signal)
        return true
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return false
        }
        if (!silent) {
          setSyncMessage(`✗ ${err?.message ?? "Sync failed"}`)
          setTimeout(() => setSyncMessage(null), 5000)
        } else {
          console.error("Automatic sync failed", err)
        }
        return false
      } finally {
        if (!silent) {
          setSyncing(false)
        }
      }
    },
    [loadInsights],
  )

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const success = await handleSync({ silent: true, signal: controller.signal })
      if (!success) {
        await loadInsights(controller.signal)
      }
    })()
    return () => controller.abort()
  }, [handleSync, loadInsights])

  useEffect(() => {
    if (!data || typeof window === "undefined") return
    const contextLines = [
      `New messages today: ${data.newMessagesToday.count} (${Math.round(
        data.newMessagesToday.deltaPercent,
      )}% vs avg)`,
      data.topRisingIssue
        ? `Top rising issue: ${data.topRisingIssue.topic} (${Math.round(
            data.topRisingIssue.deltaPercent,
          )}% WoW)`
        : "Top rising issue: none",
      `Sentiment shift: ${Math.round(data.sentimentShift.deltaPercent)}%`,
      `Urgent cases: ${data.urgentCases.count}`,
    ]
    ;(window as any).__ASSISTANT_CONTEXT__ = contextLines
  }, [data])

  const cards = useMemo<InsightCardSpec[]>(() => {
    if (!data) return placeholderCards
    const deltaVsAvg = formatDeltaLabel(data.newMessagesToday.deltaPercent, "vs 7-day avg")
    const risingIssue = data.topRisingIssue
    const risingInsight: { label: string; tone: TrendTone } = risingIssue
      ? formatDeltaLabel(risingIssue.deltaPercent, "week-over-week")
      : { label: "Monitoring all topics", tone: "neutral" }
    const sentimentValue = `${formatSignedPercent(data.sentimentShift.deltaPercent)} net sentiment`
    const sentimentDelta = formatDeltaLabel(data.sentimentShift.deltaPercent, "vs last week")
    const sentimentAvg =
      data.sentimentShift.thisWeekAvg !== null
        ? `This week avg ${Number(data.sentimentShift.thisWeekAvg).toFixed(2)}`
        : "Not enough signal yet"
    const urgentReasons =
      data.urgentCases.topReasons.length > 0
        ? `Mostly ${data.urgentCases.topReasons.slice(0, 2).join(" + ")}`
        : "No critical triggers"

    const cardList: InsightCardSpec[] = [
      {
        key: "messages",
        title: "New Messages Today",
        value: data.newMessagesToday.count,
        insight: deltaVsAvg.label,
        insightTone: deltaVsAvg.tone,
      },
      {
        key: "issue",
        title: "Top Rising Issue",
        value: risingIssue?.topic ?? "No spike detected",
        insight: risingInsight.label,
        insightTone: risingInsight.tone,
        extra: risingIssue?.exampleSubjectLine ? (
          <p className="text-xs text-gray-400">
            e.g. &quot;
            {risingIssue.exampleSubjectLine.length > 70
              ? `${risingIssue.exampleSubjectLine.slice(0, 70)}...`
              : risingIssue.exampleSubjectLine}
            &quot;
          </p>
        ) : null,
      },
      {
        key: "sentiment",
        title: "Sentiment Shift",
        value: sentimentValue,
        insight: sentimentDelta.label,
        insightTone: sentimentDelta.tone,
        extra: <p className="text-xs text-gray-400">{sentimentAvg}</p>,
      },
      {
        key: "urgent",
        title: "Urgent Cases",
        value: `${data.urgentCases.count} urgent`,
        insight: urgentReasons,
        insightTone: "neutral",
      },
    ]
    return cardList
  }, [data])

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Policy Intelligence</p>
          <p className="text-base text-gray-600">Decision-grade signals updated live from constituent inboxes</p>
        </div>
        <button
          onClick={() => {
            void handleSync()
          }}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
        >
          {syncing ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Now
            </>
          )}
        </button>
      </div>

      {error ? <div className="text-sm text-red-600 border border-red-100 bg-red-50 rounded-lg px-3 py-2">{error}</div> : null}
      {syncMessage ? (
        <div className={`text-sm border rounded-lg px-3 py-2 ${syncMessage.includes('✓') ? 'text-green-600 border-green-100 bg-green-50' : 'text-amber-600 border-amber-100 bg-amber-50'}`}>
          {syncMessage}
        </div>
      ) : null}

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
                insightTone={card.insightTone ?? "default"}
                delay={0.05 * idx}
              >
                {card.extra}
              </InsightCard>
            ))}
      </motion.div>
    </section>
  )
}


