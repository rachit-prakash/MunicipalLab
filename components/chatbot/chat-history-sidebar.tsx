'use client'

import * as React from 'react'
import { MessageSquare, Plus, Trash2, MoreVertical } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatHistorySidebarProps {
  currentSessionId?: string
  onSessionSelect: (sessionId: string) => void
  onNewChat: () => void
}

export function ChatHistorySidebar({ currentSessionId, onSessionSelect, onNewChat }: ChatHistorySidebarProps) {
  const [sessions, setSessions] = React.useState<ChatSession[]>([])
  const [loading, setLoading] = React.useState(true)

  // Load sessions on mount
  React.useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      const res = await fetch('/api/assistant/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation()
    
    if (!confirm('Delete this chat?')) return

    try {
      const res = await fetch(`/api/assistant/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          onNewChat()
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  // Group sessions by date
  const groupedSessions = React.useMemo(() => {
    const groups: Record<string, ChatSession[]> = {
      Today: [],
      Yesterday: [],
      'Last 7 days': [],
      'Last 30 days': [],
      Older: [],
    }

    sessions.forEach(session => {
      const date = new Date(session.updated_at)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) groups['Today'].push(session)
      else if (diffDays === 1) groups['Yesterday'].push(session)
      else if (diffDays < 7) groups['Last 7 days'].push(session)
      else if (diffDays < 30) groups['Last 30 days'].push(session)
      else groups['Older'].push(session)
    })

    return groups
  }, [sessions])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col bg-white"
    >
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <Button
          onClick={onNewChat}
          size="sm"
          className="w-full bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading chats...</div>
          ) : sessions.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No chat history yet
              <div className="mt-1 text-xs text-slate-400">Start a conversation to see it here.</div>
            </div>
          ) : (
            <>
              {Object.entries(groupedSessions).map(([group, groupSessions]) => {
                if (groupSessions.length === 0) return null
                return (
                  <div key={group} className="mb-5">
                    <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {group}
                    </div>
                    <AnimatePresence initial={false}>
                      {groupSessions.map((session) => (
                        <motion.div
                          key={session.id}
                          layout
                          onClick={() => onSessionSelect(session.id)}
                          className={cn(
                            'group mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left transition-all cursor-pointer',
                            currentSessionId === session.id
                              ? 'bg-slate-100'
                              : 'hover:bg-slate-50'
                          )}
                          whileHover={{ x: 2 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition group-hover:bg-slate-200">
                            <MessageSquare className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-700">{session.title}</div>
                            <div className="text-xs text-slate-400">{formatDate(session.updated_at)}</div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 transition group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => deleteSession(session.id, e as any)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  )
}

