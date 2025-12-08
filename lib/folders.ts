import type { ThreadRow } from "./types"
import { filterMessage } from "./message-filter"

export type FolderId =
  | "from-people"
  | "crisis-emergency"
  | "needs-response"
  | "form-letters"
  | "vips"
  | "first-contact"
  | "deadline"

export interface Folder {
  id: FolderId
  name: string
  description: string
  filterFn: (thread: ThreadRow) => boolean
  color: string // Tailwind color class
}

export const folders: Folder[] = [
  {
    id: "from-people",
    name: "From People",
    description: "Emails from actual people, excluding newsletters and automated messages",
    color: "text-blue-600",
    filterFn: (thread) => {
      // Priority 1: Use AI classification if available
      if (thread.senderType === "person") {
        return true
      }
      if (thread.senderType === "automated") {
        return false
      }
      // Priority 2: Fallback to rule-based filter for unclassified threads
      const result = filterMessage(thread.sender, thread.subject, thread.summary)
      return result.shouldAnalyze
    },
  },
  {
    id: "crisis-emergency",
    name: "Crisis/Emergency",
    description: "Urgent constituent emergencies requiring immediate attention",
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
      if (!thread.unread) return false

      // Priority 1: Use AI classification if available
      if (thread.senderType === "person") return true
      if (thread.senderType === "automated") return false

      // Priority 2: Fallback to rule-based filter for unclassified threads
      const fromPeople = filterMessage(thread.sender, thread.subject, thread.summary).shouldAnalyze
      return fromPeople
    },
  },
  {
    id: "form-letters",
    name: "Form Letters",
    description: "Mass emails and organized advocacy campaigns",
    color: "text-gray-600",
    filterFn: (thread) => {
      // Look for indicators of form letters
      const subject = (thread.subject || "").toLowerCase()
      const summary = (thread.summary || "").toLowerCase()

      // Common form letter patterns
      const formLetterIndicators = [
        "click here to add your name",
        "sign the petition",
        "join us in",
        "add your voice",
        "take action",
        "automated message",
      ]

      return formLetterIndicators.some(
        (indicator) => subject.includes(indicator) || summary.includes(indicator)
      )
    },
  },
  {
    id: "vips",
    name: "VIPs",
    description: "Important contacts, major donors, and local officials",
    color: "text-purple-600",
    filterFn: (thread) => {
      // For now, we'll use a simple heuristic
      // In the future, this should check a VIP list in the database
      const sender = thread.sender.toLowerCase()

      // Check for government/official email domains
      const vipDomains = [
        ".gov",
        ".mil",
        "senate.gov",
        "house.gov",
        "state.",
        "city.",
        "county.",
      ]

      return vipDomains.some((domain) => sender.includes(domain))
    },
  },
  {
    id: "first-contact",
    name: "First Contact",
    description: "New constituents reaching out for the first time",
    color: "text-green-600",
    filterFn: (thread) => {
      // This is a placeholder - in production, you'd check against a database
      // to see if this sender has contacted you before
      // For now, we'll return false (requires database implementation)
      return false
    },
  },
  {
    id: "deadline",
    name: "Deadline",
    description: "Time-sensitive matters with approaching deadlines",
    color: "text-yellow-600",
    filterFn: (thread) => {
      return thread.urgencyReasons?.includes("deadline") || false
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
