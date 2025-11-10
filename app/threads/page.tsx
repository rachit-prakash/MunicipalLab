"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FiltersToolbar } from "@/components/threads/filters-toolbar"
import { ThreadsTable } from "@/components/threads/threads-table"
import { ReplyDrawer } from "@/components/threads/reply-drawer"
import type { ThreadRow } from "@/lib/types"

// Sample data
const sampleThreads: ThreadRow[] = [
  {
    id: "1",
    subject: "Healthcare Reform Bill - Constituent Support",
    sender: "John Smith",
    receivedAt: "2025-10-31T14:07:00Z",
    type: "CASEWORK",
    topic: "Healthcare",
    stance: "SUPPORT",
    summary: "Constituent expressing strong support for the proposed healthcare reform bill...",
    confidence: 0.92,
    unread: true,
  },
  {
    id: "2",
    subject: "Immigration Policy Concerns",
    sender: "Maria Garcia",
    receivedAt: "2025-10-30T10:32:00Z",
    type: "CORRESPONDENCE",
    topic: "Immigration",
    stance: "OPPOSE",
    summary: "Local business owner expressing concerns about new immigration guidelines...",
    confidence: 0.78,
    unread: false,
  },
  {
    id: "3",
    subject: "Infrastructure Investment Support",
    sender: "Robert Johnson",
    receivedAt: "2025-10-29T16:45:00Z",
    type: "CASEWORK",
    topic: "Infrastructure",
    summary: "Community group requesting funding for local infrastructure projects...",
    confidence: 0.65,
    unread: true,
  },
  {
    id: "4",
    subject: "Education Funding Request",
    sender: "Susan Williams",
    receivedAt: "2025-10-28T09:20:00Z",
    type: "CORRESPONDENCE",
    topic: "Education",
    stance: "SUPPORT",
    summary: "School administrator advocating for increased education funding...",
    confidence: 0.88,
    unread: false,
  },
  {
    id: "5",
    subject: "Environmental Protection Concerns",
    sender: "David Chen",
    receivedAt: "2025-10-27T13:15:00Z",
    type: "CASEWORK",
    topic: "Environment",
    stance: "OPPOSE",
    summary: "Environmental group opposing proposed industrial development...",
    confidence: 0.82,
    unread: true,
  },
]

function ThreadsPageInner() {
  const [selectedThread, setSelectedThread] = useState<ThreadRow | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [filters, setFilters] = useState({
    type: "both",
    topics: [] as string[],
  })
  const searchParams = useSearchParams()
  const query = (searchParams.get("q") ?? "").toLowerCase()

  const filteredThreads = sampleThreads.filter((thread) => {
    if (filters.type !== "both" && thread.type !== filters.type.toUpperCase()) return false
    if (filters.topics.length > 0 && !filters.topics.includes(thread.topic)) return false
    if (query) {
      const haystack = `${thread.subject} ${thread.sender} ${thread.summary}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })

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
            <ThreadsTable threads={filteredThreads} onThreadClick={setSelectedThread} />
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
