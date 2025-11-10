"use client"

import type { ThreadRow } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, getTopicBadgeClasses } from "@/lib/utils"

interface ThreadsTableProps {
  threads: ThreadRow[]
  onThreadClick: (thread: ThreadRow) => void
}

export function ThreadsTable({ threads, onThreadClick }: ThreadsTableProps) {
  if (threads.length === 0) {
    return <div className="flex items-center justify-center h-96 text-ink-500">No threads match your filters.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow hoverable={false}>
          <TableHead>Type</TableHead>
          <TableHead>Topic</TableHead>
          <TableHead className="max-w-xs">Summary</TableHead>
          <TableHead>Received</TableHead>
          <TableHead className="w-36 text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {threads.map((thread) => (
          <TableRow
            key={thread.id}
            onClick={() => onThreadClick(thread)}
            className="cursor-pointer group border-l-2 border-transparent transition-colors hover:border-secondary"
          >
            <TableCell>
              <Badge variant="solid" className="bg-ink-100 text-ink-900">
                {thread.type === "CASEWORK" ? "Casework" : "Correspondence"}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="solid" className={getTopicBadgeClasses(thread.topic)}>{thread.topic}</Badge>
            </TableCell>
            <TableCell className="max-w-xs truncate text-ink-600" title={thread.summary}>
              {thread.summary}
            </TableCell>
            <TableCell className="text-xs text-ink-500">{formatDate(thread.receivedAt)}</TableCell>
            <TableCell className="w-36">
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
  )
}
