"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { ThreadsTable } from "@/components/threads/threads-table"
import { ReplyDrawer } from "@/components/threads/reply-drawer"
import { FolderNav } from "@/components/threads/folder-nav"
import type { ThreadRow } from "@/lib/types"
import type { FolderId } from "@/lib/folders"
import { getFoldersForThread, folders } from "@/lib/folders"
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
        // Don't send folder parameter - fetch all threads and filter client-side
        const res = await fetch(`/api/gmail/threads?${params.toString()}` , {
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
  const [selectedFolder, setSelectedFolder] = useState<FolderId | null>(null)
  const { threads, loading, error } = useThreadsData(query)
  const [selectedThread, setSelectedThread] = useState<ThreadRow | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Calculate thread counts for each folder (for display in folder nav)
  const threadCounts = useMemo(() => {
    if (!threads) return {}
    const counts: Record<FolderId, number> = {} as any
    for (const folder of folders) {
      counts[folder.id] = threads.filter(folder.filterFn).length
    }
    return counts
  }, [threads])

  // Filter threads by selected folder and search query
  const filteredThreads = useMemo(() => {
    let list = threads ?? []

    // Apply folder filter if one is selected
    if (selectedFolder) {
      const folder = folders.find((f) => f.id === selectedFolder)
      if (folder) {
        list = list.filter(folder.filterFn)
      }
    }

    // Apply search query filter
    if (query) {
      list = list.filter((thread) => {
        const haystack = `${thread.subject} ${thread.sender} ${thread.summary}`.toLowerCase()
        return haystack.includes(query)
      })
    }

    return list
  }, [threads, selectedFolder, query])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <Suspense fallback={null}>
            <Header onMenuClick={() => setMobileNavOpen(true)} />
          </Suspense>
          <main className="mt-16 ml-0 md:ml-12 flex-1 overflow-auto transition-[margin] duration-300">
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
                    <BreadcrumbPage>Inbox</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="px-4 sm:px-6 py-6">
              {loading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner className="size-4" />
                    <span>Loading inbox…</span>
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

        <aside className="hidden lg:block w-64 border-l bg-muted/20 p-4">
          <FolderNav
            selectedFolder={selectedFolder}
            onFolderSelect={setSelectedFolder}
            threadCounts={threadCounts}
          />
        </aside>
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


