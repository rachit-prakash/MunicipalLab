"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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

  return { threads, setThreads, loading, error }
}

function ThreadsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = (searchParams.get("q") ?? "").toLowerCase()
  const folderParam = searchParams.get("folder") as FolderId | null
  const [selectedFolder, setSelectedFolder] = useState<FolderId | null>(folderParam)
  const { threads, setThreads, loading, error } = useThreadsData(query)
  const [selectedThread, setSelectedThread] = useState<ThreadRow | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Sync handler
  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        cache: "no-store",
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Sync failed" }))
        throw new Error(errorData.message || errorData.error || "Failed to sync")
      }

      setSyncMessage("✓ Synced successfully!")
      setTimeout(() => setSyncMessage(null), 3000)

      // Refresh the page to load new threads
      router.refresh()
    } catch (err: any) {
      setSyncMessage(`✗ ${err?.message ?? "Sync failed"}`)
      setTimeout(() => setSyncMessage(null), 5000)
    } finally {
      setSyncing(false)
    }
  }, [router])

  // Update selected folder when URL parameter changes
  useEffect(() => {
    setSelectedFolder(folderParam)
  }, [folderParam])

  // Listen for thread updates and refresh
  useEffect(() => {
    const handleThreadUpdate = (event: CustomEvent) => {
      const { threadId, isReplied } = event.detail;

      // Update local state optimistically
      setThreads((currentThreads) => {
        if (!currentThreads) return currentThreads;
        return currentThreads.map((thread) =>
          thread.id === threadId
            ? { ...thread, isReplied }
            : thread
        );
      });
    };

    window.addEventListener('thread-updated', handleThreadUpdate as EventListener);
    return () => {
      window.removeEventListener('thread-updated', handleThreadUpdate as EventListener);
    };
  }, []);

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
              <div className="flex items-start justify-between gap-4 mb-4">
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
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:bg-primary/50 rounded-lg transition-colors"
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
              {syncMessage && (
                <div className={`mb-4 text-sm border rounded-lg px-3 py-2 ${
                  syncMessage.includes('✓')
                    ? 'text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50'
                    : 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50'
                }`}>
                  {syncMessage}
                </div>
              )}
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
                <ThreadsTable 
                  key={selectedFolder || 'all'} 
                  threads={filteredThreads} 
                  onThreadClick={setSelectedThread} 
                />
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


