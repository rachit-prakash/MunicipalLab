/* Data types for Legaside */

export type ThreadType = "CASEWORK" | "CORRESPONDENCE"
export type Stance = "SUPPORT" | "OPPOSE" | "NEUTRAL"
export type ReplyMode = "template" | "ai"

export type UrgencyLevel = "low" | "medium" | "high" | "critical"

export interface ThreadRow {
  id: string
  subject: string
  sender: string
  receivedAt: string // ISO format
  type: ThreadType
  topic: string
  stance?: Stance
  summary: string
  confidence: number // 0.0-1.0
  unread: boolean
  urgencyLevel?: UrgencyLevel
  urgencyReasons?: string[]
  sentimentScore?: number // -1.0 to 1.0
  folders: string[] // Array of folder IDs this thread belongs to (e.g., ['inbox', 'from-people'])
  isReplied: boolean // Whether user has replied to this thread
}

export interface Citation {
  title: string
  url?: string
  snippet?: string
}

export interface ReplyDraft {
  mode: ReplyMode
  text: string
  citations?: Citation[]
  confidence?: number
}

export interface TopicRow {
  id: string
  name: string
  usageCount: number
  status: "active" | "archived"
}

export interface TemplateRow {
  id: string
  topic: string
  stance: Stance | "GENERIC"
  version: number
  updatedAt: string
  content: string
}

export interface DashboardSummary {
  total: number
  caseworkPct: number
  topTopics: Array<{ topic: string; count: number }>
  trendsByTopic: Record<string, Array<{ date: string; support: number; oppose: number; neutral: number }>>
}
