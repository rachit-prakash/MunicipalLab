"use client"

import type { ThreadRow } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, extractSenderName } from "@/lib/utils"
import { decodeHtmlEntities } from "@/lib/html-decode"
import { useMemo, useState } from "react"
import { ConstituentProfileCard } from "@/components/constituents/profile-card"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ThreadsTableProps {
  threads: ThreadRow[]
  onThreadClick: (thread: ThreadRow) => void
}

export function ThreadsTable({ threads, onThreadClick }: ThreadsTableProps) {
  const [sortKey, setSortKey] = useState<"receivedAt">("receivedAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const pageSize = 25
  const { toast } = useToast()

  const handleMarkReplied = async (thread: ThreadRow, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click

    try {
      const response = await fetch(`/api/gmail/threads/${thread.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isReplied: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark as replied')
      }

      toast({
        title: "Marked as replied",
        description: "This thread has been marked as replied."
      })

      // Dispatch event to refresh threads list
      window.dispatchEvent(new CustomEvent('thread-updated', {
        detail: { threadId: thread.id, isReplied: true }
      }))
    } catch (error) {
      console.error('Error marking as replied:', error)
      toast({
        title: "Error",
        description: "Could not mark thread as replied.",
        variant: "destructive"
      })
    }
  }

  const handleMarkUnreplied = async (thread: ThreadRow, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click

    try {
      const response = await fetch(`/api/gmail/threads/${thread.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isReplied: false }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark as unreplied')
      }

      toast({
        title: "Marked as unreplied",
        description: "This thread has been marked as unreplied."
      })

      // Dispatch event to refresh threads list
      window.dispatchEvent(new CustomEvent('thread-updated', {
        detail: { threadId: thread.id, isReplied: false }
      }))
    } catch (error) {
      console.error('Error marking as unreplied:', error)
      toast({
        title: "Error",
        description: "Could not mark thread as unreplied.",
        variant: "destructive"
      })
    }
  }

  const handleMarkRead = async (thread: ThreadRow, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click

    try {
      const response = await fetch(`/api/gmail/threads/${thread.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unread: false }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }

      toast({
        title: "Marked as read",
        description: "This thread has been marked as read."
      })

      // Dispatch event to refresh threads list
      window.dispatchEvent(new CustomEvent('thread-updated', {
        detail: { threadId: thread.id, unread: false }
      }))
    } catch (error) {
      console.error('Error marking as read:', error)
      toast({
        title: "Error",
        description: "Could not mark thread as read.",
        variant: "destructive"
      })
    }
  }

  const handleMarkUnread = async (thread: ThreadRow, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click

    try {
      const response = await fetch(`/api/gmail/threads/${thread.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unread: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark as unread')
      }

      toast({
        title: "Marked as unread",
        description: "This thread has been marked as unread."
      })

      // Dispatch event to refresh threads list
      window.dispatchEvent(new CustomEvent('thread-updated', {
        detail: { threadId: thread.id, unread: true }
      }))
    } catch (error) {
      console.error('Error marking as unread:', error)
      toast({
        title: "Error",
        description: "Could not mark thread as unread.",
        variant: "destructive"
      })
    }
  }

  const sorted = useMemo(() => {
    const copy = [...threads]
    copy.sort((a, b) => {
      const av = new Date(a.receivedAt).getTime()
      const bv = new Date(b.receivedAt).getTime()
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })
    return copy
  }, [threads, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageClamped = Math.min(page, totalPages)
  const start = (pageClamped - 1) * pageSize
  const end = start + pageSize
  const visible = sorted.slice(start, end)

  function toggleSort(key: "receivedAt") {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  // Early return AFTER hooks are declared (React rules require hooks to run in the same order every render)
  if (threads.length === 0) {
    return <div className="flex items-center justify-center h-96 text-muted-foreground">No threads match your filters.</div>
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <Table className="min-w-0">
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead className="hidden md:table-cell w-48">From</TableHead>
            <TableHead className="max-w-xs hidden sm:table-cell">Summary</TableHead>
            <TableHead
              role="columnheader"
              aria-sort={sortKey === "receivedAt" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
              className="hidden sm:table-cell cursor-pointer select-none"
              onClick={() => toggleSort("receivedAt")}
              title="Sort by received date"
            >
              Received
            </TableHead>
            <TableHead className="w-32 text-right hidden sm:table-cell">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {visible.map((thread, index) => (
              <motion.tr
                key={thread.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 26,
                  delay: index * 0.03, // Stagger effect
                }}
                layout
                onClick={() => onThreadClick(thread)}
                className={`cursor-pointer group border-l-4 transition-all duration-100 hover:border-accent ${thread.unread
                    ? 'border-gray-400 bg-gray-100 dark:bg-gray-800/40'
                    : 'border-transparent'
                  }`}
              >
                <TableCell className="hidden md:table-cell max-w-[200px]">
                  <ConstituentProfileCard email={thread.sender} currentUrgency={thread.urgencyLevel}>
                    <div className="min-w-0">
                      <div className={`text-sm truncate transition-all duration-100 ${thread.unread ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-medium text-foreground'}`} title={extractSenderName(decodeHtmlEntities(thread.sender))}>{extractSenderName(decodeHtmlEntities(thread.sender))}</div>
                      <div className={`text-xs truncate transition-all duration-100 ${thread.unread ? 'font-semibold text-gray-700 dark:text-gray-300' : 'text-muted-foreground'}`} title={decodeHtmlEntities(thread.subject)}>{decodeHtmlEntities(thread.subject)}</div>
                    </div>
                  </ConstituentProfileCard>
                </TableCell>
                <TableCell className={`max-w-xs truncate hidden sm:table-cell transition-all duration-100 ${thread.unread ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-muted-foreground'}`} title={decodeHtmlEntities(thread.summary)}>
                  {decodeHtmlEntities(thread.summary)}
                </TableCell>
                <TableCell className={`text-xs hidden sm:table-cell transition-all duration-100 ${thread.unread ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-muted-foreground'}`}>{formatDate(thread.receivedAt)}</TableCell>
                <TableCell className="w-32 hidden sm:table-cell">
                  <div className="flex justify-end gap-1">
                    {thread.unread ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto h-8 w-8 p-0"
                        onClick={(e) => handleMarkRead(thread, e)}
                        title="Mark as read"
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto h-8 w-8 p-0"
                        onClick={(e) => handleMarkUnread(thread, e)}
                        title="Mark as unread"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {!thread.isReplied ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto h-8 w-8 p-0"
                        onClick={(e) => handleMarkReplied(thread, e)}
                        title="Mark as replied"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto h-8 w-8 p-0"
                        onClick={(e) => handleMarkUnreplied(thread, e)}
                        title="Mark as unreplied"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
      <div className="mt-4 flex items-center justify-end gap-2 px-4">
        <span className="text-xs text-muted-foreground">
          Page {pageClamped} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={pageClamped <= 1}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={pageClamped >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
