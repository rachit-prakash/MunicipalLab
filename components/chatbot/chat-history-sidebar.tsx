'use client'

import * as React from 'react'
import { MessageSquare, Plus, Trash2, MoreVertical } from 'lucide-react'
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
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button onClick={onNewChat} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Loading chats...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No chat history yet
            </div>
          ) : (
            <>
              {Object.entries(groupedSessions).map(([group, groupSessions]) => {
                if (groupSessions.length === 0) return null
                return (
                  <div key={group} className="mb-4">
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {group}
                    </div>
                    {groupSessions.map(session => (
                      <div
                        key={session.id}
                        className={cn(
                          'group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-accent transition-colors',
                          currentSessionId === session.id && 'bg-accent'
                        )}
                        onClick={() => onSessionSelect(session.id)}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{session.title}</div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => deleteSession(session.id, e as any)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

