"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { DashboardKPIs } from "@/components/dashboard/kpis"
import { TopicsChart } from "@/components/dashboard/topics-chart"
import { StanceTrendChart } from "@/components/dashboard/stance-trend-chart"
import { Spinner } from "@/components/ui/spinner"

type InboxListResponse = {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

type GmailMessageHeader = { name?: string; value?: string }
type GmailMessage = {
  id?: string
  threadId?: string
  snippet?: string
  internalDate?: string
  payload?: {
    headers?: GmailMessageHeader[]
  }
}

type TrendPoint = { date: string; support: number; oppose: number; neutral: number }

type DashboardData = {
  total: number
  caseworkPct: number
  topTopics: Array<{ topic: string; count: number }>
  trendsByTopic: Record<string, TrendPoint[]>
}

function getHeader(headers: GmailMessageHeader[] | undefined, key: string): string {
  if (!headers?.length) return ""
  const found = headers.find((h) => (h?.name ?? "").toLowerCase() === key.toLowerCase())
  return (found?.value ?? "").trim()
}

async function fetchInbox(opts?: { demo?: boolean }): Promise<InboxListResponse> {
  const url = opts?.demo ? "/api/gmail/inbox?demo=1" : "/api/gmail/inbox"
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    throw new Error(message || "Failed to load inbox")
  }
  return (await res.json()) as InboxListResponse
}

async function fetchMessage(id: string, opts?: { demo?: boolean }): Promise<GmailMessage> {
  const url = opts?.demo ? `/api/gmail/messages/${encodeURIComponent(id)}?demo=1` : `/api/gmail/messages/${encodeURIComponent(id)}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    throw new Error(message || `Failed to load message ${id}`)
  }
  const data = await res.json().catch(async () => {
    const txt = await res.text()
    try {
      return JSON.parse(txt)
    } catch {
      return {}
    }
  })
  if (data && typeof data === "object" && "body" in data && (data as any).body) {
    return (data as any).body as GmailMessage
  }
  return data as GmailMessage
}

function normalizeDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

function inLastNDays(date: Date, n: number): boolean {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return diffMs >= 0 && diffMs <= n * 24 * 60 * 60 * 1000
}

function detectCasework(text: string): boolean {
  const s = text.toLowerCase()
  const words = [
    "casework",
    "help",
    "assistance",
    "can you help",
    "status",
    "issue",
    "problem",
    "passport",
    "benefits",
    "medicare",
    "social security",
    "irs",
    "unemployment",
  ]
  return words.some((w) => s.includes(w))
}

function detectTopic(text: string): string | null {
  const s = text.toLowerCase()
  const topicMap: Record<string, string[]> = {
    Healthcare: ["healthcare", "health care", "medicare", "medicaid", "drug", "pharma", "insurance", "hospital"],
    Immigration: ["immigration", "visa", "border", "asylum", "refugee", "immigrant"],
    Infrastructure: ["infrastructure", "bridge", "road", "highway", "rail", "transit", "broadband"],
    Education: ["education", "school", "student", "college", "loan", "tuition", "teacher"],
    Environment: ["climate", "environment", "energy", "pollution", "emissions", "epa", "wildfire"],
  }
  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some((k) => s.includes(k))) return topic
  }
  return null
}

function detectWarTopic(text: string): "Israel–Palestine War" | "Ukraine–Russia War" | null {
  const s = text.toLowerCase()
  if (["israel", "palestine", "gaza", "hamas", "idf", "west bank", "ceasefire"].some((k) => s.includes(k))) {
    return "Israel–Palestine War"
  }
  if (["ukraine", "ukrainian", "russia", "russian", "putin", "kyiv", "donbas", "crimea", "zelensky"].some((k) => s.includes(k))) {
    return "Ukraine–Russia War"
  }
  return null
}

function detectStance(text: string): "support" | "oppose" | "neutral" {
  const s = text.toLowerCase()
  const supportHits = ["support", "in favor", "back", "approve", "pro-"].some((k) => s.includes(k))
  const opposeHits = ["oppose", "against", "condemn", "disapprove", "anti-"].some((k) => s.includes(k))
  if (supportHits && !opposeHits) return "support"
  if (opposeHits && !supportHits) return "oppose"
  return "neutral"
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        // Try normal mode first; if unauthorized, retry in demo
        let demo = false
        let inbox: InboxListResponse | null = null
        try {
          inbox = await fetchInbox({ demo })
        } catch (e: any) {
          // Fallback to demo if auth fails
          demo = true
          inbox = await fetchInbox({ demo })
        }
        const ids = (inbox?.messages ?? []).map((m) => m.id).filter(Boolean) as string[]
        const toResolve = ids.slice(0, 50)
        const resolved = await Promise.allSettled(toResolve.map((id) => fetchMessage(id, { demo })))
        const messages: GmailMessage[] = resolved
          .filter((r): r is PromiseFulfilledResult<GmailMessage> => r.status === "fulfilled")
          .map((r) => r.value)

        // Aggregate analytics
        const now = new Date()
        const daysBack = 30
        const dayLabels: string[] = []
        for (let i = daysBack - 1; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          dayLabels.push(normalizeDateLabel(d))
        }

        let total = inbox?.resultSizeEstimate ?? messages.length
        if (typeof total !== "number" || total <= 0) total = messages.length

        const caseworkCount = messages.reduce((acc, msg) => {
          const headers = msg?.payload?.headers ?? []
          const subject = getHeader(headers, "Subject") || ""
          const snippet = (msg?.snippet ?? "").trim()
          const text = `${subject}\n${snippet}`
          return acc + (detectCasework(text) ? 1 : 0)
        }, 0)
        const caseworkPct = total ? Math.round((caseworkCount / Math.max(messages.length, 1)) * 100) : 0

        const topicCounts: Record<string, number> = {}
        for (const msg of messages) {
          const headers = msg?.payload?.headers ?? []
          const subject = getHeader(headers, "Subject") || ""
          const snippet = (msg?.snippet ?? "").trim()
          const text = `${subject}\n${snippet}`
          const topic = detectTopic(text)
          if (topic) topicCounts[topic] = (topicCounts[topic] ?? 0) + 1
        }
        const topTopics = Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([topic, count]) => ({ topic, count }))

        const trendsByTopic: Record<string, TrendPoint[]> = {}
        const warTopics: Array<"Israel–Palestine War" | "Ukraine–Russia War"> = ["Israel–Palestine War", "Ukraine–Russia War"]
        for (const war of warTopics) {
          const seriesMap: Record<string, { support: number; oppose: number; neutral: number }> = {}
          for (const label of dayLabels) {
            seriesMap[label] = { support: 0, oppose: 0, neutral: 0 }
          }

          for (const msg of messages) {
            const headers = msg?.payload?.headers ?? []
            const subject = getHeader(headers, "Subject") || ""
            const snippet = (msg?.snippet ?? "").trim()
            const dateHeader = getHeader(headers, "Date")
            const dateObj = dateHeader ? new Date(dateHeader) : msg.internalDate ? new Date(Number(msg.internalDate)) : null
            if (!dateObj || !inLastNDays(dateObj, daysBack)) continue
            const text = `${subject}\n${snippet}`
            const matched = detectWarTopic(text)
            if (matched !== war) continue
            const stance = detectStance(text)
            const label = normalizeDateLabel(dateObj)
            if (!seriesMap[label]) seriesMap[label] = { support: 0, oppose: 0, neutral: 0 }
            seriesMap[label][stance] += 1
          }

          trendsByTopic[war] = dayLabels.map((l) => ({ date: l, ...seriesMap[l] }))
        }

        const result: DashboardData = {
          total,
          caseworkPct,
          topTopics,
          trendsByTopic,
        }
        if (!cancelled) setData(result)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load dashboard")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
      <div className="flex-1 flex flex-col ml-0 md:ml-[var(--app-sidebar-width,256px)]">
        <Suspense fallback={null}>
          <Header onMenuClick={() => setMobileNavOpen(true)} />
        </Suspense>
        <main className="mt-16 flex-1 overflow-auto">
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-ink-900">Dashboard</h1>
              <p className="text-sm text-ink-500">KPIs and trends at a glance</p>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-ink-600">
                <Spinner className="size-4" />
                <span>Loading dashboard…</span>
              </div>
            ) : null}

            {/* KPI Tiles */}
            {data ? <DashboardKPIs total={data.total} caseworkPct={data.caseworkPct} /> : null}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data ? <TopicsChart topics={data.topTopics} /> : null}
              {data ? <StanceTrendChart trendsByTopic={data.trendsByTopic} defaultTopic="Israel–Palestine War" /> : null}
            </div>

            {!data && !loading && error ? (
              <div className="text-sm text-red-600">Failed to load analytics: {error}</div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
