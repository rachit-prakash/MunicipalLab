import type { ThreadRow } from "./types"

export type FolderId =
  | "recommended"
  | "unread"
  | "from-people"
  | "crisis-emergency"
  | "needs-response"
  | "replied"

export interface Folder {
  id: FolderId
  name: string
  description: string
  filterFn: (thread: ThreadRow) => boolean
  color: string // Tailwind color class
}

export const folders: Folder[] = [
  {
    id: "recommended",
    name: "Recommended",
    description: "Most important unread emails requiring your attention - from real people, not yet replied to, with urgency indicators",
    color: "text-blue-600",
    filterFn: (thread) => {
      // Very strict filter: Must be unread, from people, not replied, and have some urgency
      return (
        thread.unread === true &&
        thread.folders.includes("from-people") &&
        thread.isReplied === false &&
        (thread.urgencyLevel === "high" ||
         thread.urgencyLevel === "critical" ||
         thread.urgencyLevel === "medium")
      )
    },
  },
  {
    id: "unread",
    name: "Unread",
    description: "All unread messages",
    color: "text-gray-600",
    filterFn: (thread) => {
      return thread.unread === true
    },
  },
  {
    id: "from-people",
    name: "From People",
    description: "Emails from actual people, excluding newsletters and automated messages",
    color: "text-purple-600",
    filterFn: (thread) => {
      return thread.folders.includes("from-people")
    },
  },
  {
    id: "crisis-emergency",
    name: "Urgent Cases",
    description: "High priority messages requiring immediate attention",
    color: "text-red-600",
    filterFn: (thread) => {
      return (
        thread.urgencyLevel === "critical" || thread.urgencyLevel === "high"
      )
    },
  },
  {
    id: "needs-response",
    name: "Needs Response",
    description: "Unanswered emails that require action",
    color: "text-orange-600",
    filterFn: (thread) => {
      return thread.unread && thread.folders.includes("from-people") && !thread.isReplied
    },
  },
  {
    id: "replied",
    name: "Replied",
    description: "Threads you've already responded to",
    color: "text-green-600",
    filterFn: (thread) => {
      return thread.isReplied === true
    },
  },
]

export function getFoldersForThread(thread: ThreadRow): FolderId[] {
  return folders
    .filter((folder) => folder.filterFn(thread))
    .map((folder) => folder.id)
}

export function getThreadsInFolder(threads: ThreadRow[], folderId: FolderId): ThreadRow[] {
  const folder = folders.find((f) => f.id === folderId)
  if (!folder) return []
  return threads.filter(folder.filterFn)
}

export function getFolderById(folderId: FolderId): Folder | undefined {
  return folders.find((f) => f.id === folderId)
}
