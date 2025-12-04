"use client"

import type { ThreadRow } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, getTopicBadgeClasses } from "@/lib/utils"
import { useMemo, useState } from "react"

interface ThreadsTableProps {
  threads: ThreadRow[]
  onThreadClick: (thread: ThreadRow) => void
}

export function ThreadsTable({ threads, onThreadClick }: ThreadsTableProps) {
  if (threads.length === 0) {
    return <div className="flex items-center justify-center h-96 text-muted-foreground">No threads match your filters.</div>
  }

  const [sortKey, setSortKey] = useState<"type" | "topic" | "receivedAt">("receivedAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const pageSize = 25

  const sorted = useMemo(() => {
    const copy = [...threads]
    copy.sort((a, b) => {
      let av: string | number = ""
      let bv: string | number = ""
      if (sortKey === "type") {
        av = a.type
        bv = b.type
      } else if (sortKey === "topic") {
        av = a.topic ?? ""
        bv = b.topic ?? ""
      } else {
        av = new Date(a.receivedAt).getTime()
        bv = new Date(b.receivedAt).getTime()
      }
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

  function toggleSort(key: "type" | "topic" | "receivedAt") {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <Table className="min-w-0">
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead
              role="columnheader"
              aria-sort={sortKey === "type" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
              className="cursor-pointer select-none"
              onClick={() => toggleSort("type")}
              title="Sort by type"
            >
              Type
            </TableHead>
            <TableHead
              role="columnheader"
              aria-sort={sortKey === "topic" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
              className="cursor-pointer select-none"
              onClick={() => toggleSort("topic")}
              title="Sort by topic"
            >
              Topic
            </TableHead>
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
            <TableHead className="w-36 text-right hidden sm:table-cell">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((thread) => (
            <TableRow
              key={thread.id}
              onClick={() => onThreadClick(thread)}
              className="cursor-pointer group border-l-2 border-transparent transition-colors hover:border-accent"
            >
              <TableCell>
                <Badge variant="neutral">
                  {thread.type === "CASEWORK" ? "Casework" : "Correspondence"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="solid" className={getTopicBadgeClasses(thread.topic)}>{thread.topic}</Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground hidden sm:table-cell" title={thread.summary}>
                {thread.summary}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{formatDate(thread.receivedAt)}</TableCell>
              <TableCell className="w-36 hidden sm:table-cell">
                <div className="flex justify-end opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onThreadClick(thread)
                    }}
                  >
                    Suggest Reply
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
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
