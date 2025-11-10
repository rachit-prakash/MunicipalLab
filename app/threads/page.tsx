"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FiltersToolbar } from "@/components/threads/filters-toolbar"
import { ThreadsTable } from "@/components/threads/threads-table"
import { ReplyDrawer } from "@/components/threads/reply-drawer"
import type { ThreadRow } from "@/lib/types"
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

function getHeader(headers: GmailMessageHeader[] | undefined, key: string): string {
  if (!headers?.length) return ""
  const found = headers.find((h) => (h?.name ?? "").toLowerCase() === key.toLowerCase())
  return (found?.value ?? "").trim()
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

function useThreadsData() {
  const [threads, setThreads] = useState<ThreadRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        // Try normal mode first; if auth fails, retry in demo
        let demo = false
        let inbox: InboxListResponse | null = null
        try {
          inbox = await fetchInbox({ demo })
        } catch {
          demo = true
          inbox = await fetchInbox({ demo })
        }
        const ids = (inbox?.messages ?? []).map((m) => m.id).filter(Boolean) as string[]
        const toResolve = ids.slice(0, 50)
        const resolved = await Promise.allSettled(toResolve.map((id) => fetchMessage(id, { demo })))
        const items = resolved
          .filter((r): r is PromiseFulfilledResult<GmailMessage> => r.status === "fulfilled")
          .map((r) => r.value)

        const rows: ThreadRow[] = items.map((msg) => {
          const headers = msg?.payload?.headers ?? []
          const subject = getHeader(headers, "Subject") || "(No subject)"
          const from = getHeader(headers, "From") || ""
          const dateHeader = getHeader(headers, "Date")
          const dateIso = dateHeader
            ? new Date(dateHeader).toISOString()
            : msg.internalDate
            ? new Date(Number(msg.internalDate)).toISOString()
            : new Date().toISOString()
          const text = `${subject}\n${(msg?.snippet ?? "").trim()}`
          return {
            id: (msg.threadId || msg.id || "").toString(),
            subject,
            sender: from,
            receivedAt: dateIso,
            type: detectCasework(text) ? "CASEWORK" : "CORRESPONDENCE",
            topic: "General",
            summary: (msg?.snippet ?? "").trim(),
            confidence: 0.7,
            unread: false,
          }
        })
        if (!cancelled) setThreads(rows)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load threads")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return { threads, loading, error }
}

function ThreadsPageInner() {
  const { threads, loading, error } = useThreadsData()
  const [selectedThread, setSelectedThread] = useState<ThreadRow | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [filters, setFilters] = useState({
    type: "both",
    topics: [] as string[],
  })
  const searchParams = useSearchParams()
  const query = (searchParams.get("q") ?? "").toLowerCase()

  const filteredThreads = useMemo(() => {
    const list = threads ?? []
    return list.filter((thread) => {
    if (filters.type !== "both" && thread.type !== filters.type.toUpperCase()) return false
    if (filters.topics.length > 0 && !filters.topics.includes(thread.topic)) return false
    if (query) {
      const haystack = `${thread.subject} ${thread.sender} ${thread.summary}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
    })
  }, [threads, filters, query])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
      <div className="flex-1 flex flex-col ml-0 md:ml-[var(--app-sidebar-width,256px)]">
        <Suspense fallback={null}>
          <Header onMenuClick={() => setMobileNavOpen(true)} />
        </Suspense>
        <main className="mt-16 flex-1 overflow-auto">
          <div className="px-4 sm:px-6 pt-6">
            <h1 className="text-xl font-semibold text-ink-900">Threads</h1>
            <p className="text-sm text-ink-500">Browse and triage conversations</p>
          </div>
          <FiltersToolbar onFiltersChange={setFilters} />
          <div className="px-4 sm:px-6 py-6">
            {loading ? (
              <div className="flex items-center gap-2 text-ink-600">
                <Spinner className="size-4" />
                <span>Loading threads…</span>
              </div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : threads ? (
              <ThreadsTable threads={filteredThreads} onThreadClick={setSelectedThread} />
            ) : null}
          </div>
        </main>
      </div>

      {selectedThread && <ReplyDrawer thread={selectedThread} onClose={() => setSelectedThread(null)} />}
    </div>
  )
}

export default function ThreadsPage() {
  return (
    <Suspense fallback={null}>
      <ThreadsPageInner />
    </Suspense>
  )
}
