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
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type ThreadListResponse = {
  items: ThreadRow[]
}

function useThreadsData(query: string) {
  const [threads, setThreads] = useState<ThreadRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ limit: "100" })
        if (query) params.set("q", query)
        const res = await fetch(`/api/gmail/threads?${params.toString()}`, {
          cache: "no-store",
        })
        if (!res.ok) {
          const message = await res.text().catch(() => res.statusText)
          throw new Error(message || "Failed to load threads")
        }
        const payload = (await res.json()) as ThreadListResponse
        if (!cancelled) {
          setThreads(payload.items ?? [])
        }
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
  }, [query])

  return { threads, loading, error }
}

function ThreadsPageInner() {
  const searchParams = useSearchParams()
  const query = (searchParams.get("q") ?? "").toLowerCase()
  const { threads, loading, error } = useThreadsData(query)
  const [selectedThread, setSelectedThread] = useState<ThreadRow | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [filters, setFilters] = useState({
    type: "both",
    topics: [] as string[],
  })

  const availableTopics = useMemo(() => {
    const list = threads ?? []
    return Array.from(
      new Set(
        list
          .map((thread) => thread.topic)
          .filter((topic): topic is string => Boolean(topic && topic !== "Uncategorized")),
      ),
    )
  }, [threads])

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
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Threads</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-xl font-semibold text-foreground">Threads</h1>
            <p className="text-sm text-muted-foreground">Browse and triage conversations</p>
          </div>
          <FiltersToolbar availableTopics={availableTopics} onFiltersChange={setFilters} />
          <div className="px-4 sm:px-6 py-6">
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner className="size-4" />
                  <span>Loading threads…</span>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
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
