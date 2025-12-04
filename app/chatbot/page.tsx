'use client'

import * as React from 'react'
import { SendHorizonal, Bot, User } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Markdown } from '@/components/ui/markdown'
import { ChatHistorySidebar } from '@/components/chatbot/chat-history-sidebar'
import { cn } from '@/lib/utils'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; isTyping?: boolean; saved?: boolean }

// Typing animation component
function TypingIndicator() {
  return (
    <div className="flex gap-1 py-2">
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

// Component for animating text appearance with markdown rendering
function TypingText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = React.useState('')
  const [currentIndex, setCurrentIndex] = React.useState(0)

  React.useEffect(() => {
    // Reset when text changes
    setDisplayedText('')
    setCurrentIndex(0)
  }, [text])

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, 15) // Adjust speed here (lower = faster)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text])

  return <Markdown>{displayedText}</Markdown>
}

export default function ChatbotPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm the Legaside AI Assistant. Ask me anything about your data.",
      saved: true,
    },
  ])
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [typingMessageId, setTypingMessageId] = React.useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, typingMessageId])

  // Auto-focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Save message to session
  async function saveMessage(role: 'user' | 'assistant', content: string, messageId: string) {
    if (!currentSessionId) return
    
    try {
      await fetch(`/api/assistant/sessions/${currentSessionId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, content }),
      })
      
      // Mark message as saved
      setMessages(m => m.map(msg => 
        msg.id === messageId ? { ...msg, saved: true } : msg
      ))
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  // Create new chat session
  async function createNewSession(firstMessage?: string) {
    try {
      const res = await fetch('/api/assistant/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          title: firstMessage ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '') : 'New Chat' 
        }),
      })
      const data = await res.json()
      setCurrentSessionId(data.session.id)
      return data.session.id
    } catch (error) {
      console.error('Failed to create session:', error)
      return null
    }
  }

  // Load a previous session
  async function loadSession(sessionId: string) {
    try {
      const res = await fetch(`/api/assistant/sessions/${sessionId}`)
      const data = await res.json()
      
      setCurrentSessionId(sessionId)
      setMessages(data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        saved: true,
      })))
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  // Start a new chat
  function handleNewChat() {
    setCurrentSessionId(null)
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm the Legaside AI Assistant. Ask me anything about your data.",
        saved: true,
      },
    ])
    inputRef.current?.focus()
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const userMsgId = crypto.randomUUID()
    const userMsg: ChatMessage = { id: userMsgId, role: 'user', content: trimmed, saved: false }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setSending(true)

    // Create session if this is the first message
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await createNewSession(trimmed)
      if (!sessionId) {
        setSending(false)
        return
      }
    }

    // Save user message
    await saveMessage('user', trimmed, userMsgId)

    // Create a placeholder for the assistant message
    const assistantMsgId = crypto.randomUUID()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isTyping: true,
      saved: false,
    }
    setMessages((m) => [...m, assistantMsg])
    setTypingMessageId(assistantMsgId)

    try {
      // Optional: provide external context via window if available
      const context =
        typeof window !== 'undefined' && Array.isArray((window as any).__ASSISTANT_CONTEXT__)
          ? ((window as any).__ASSISTANT_CONTEXT__ as string[])
          : []

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(userMsg).map(({ role, content }) => ({ role, content })),
          context,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Request failed')
      }

      const data = (await res.json()) as { role: 'assistant'; content: string }
      
      // Update the message with the actual content and trigger typing animation
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: data.content, isTyping: false }
            : msg
        )
      )
      
      // Save assistant message
      await saveMessage('assistant', data.content, assistantMsgId)
      
      // Set typing message ID to trigger animation
      setTypingMessageId(assistantMsgId)
      
      // Clear typing animation after a short delay to show full text
      setTimeout(() => {
        setTypingMessageId(null)
      }, data.content.length * 15 + 500) // Estimate typing time + buffer
    } catch (err: any) {
      const errorContent = `Sorry, I ran into an error. ${err?.message ?? ''}`
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: errorContent, isTyping: false }
            : msg
        )
      )
      setTypingMessageId(null)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex flex-col flex-1">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex gap-4',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {m.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 max-w-[85%] sm:max-w-[75%]',
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  )}
                >
                  {m.isTyping && m.role === 'assistant' ? (
                    <TypingIndicator />
                  ) : m.role === 'assistant' && m.content && typingMessageId === m.id ? (
                    <TypingText text={m.content} />
                  ) : m.role === 'assistant' ? (
                    <Markdown>{m.content}</Markdown>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {sending && typingMessageId === null && (
              <div className="flex gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gray-600" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-gray-100 text-gray-900 border border-gray-200">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background px-4 sm:px-6 py-4">
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question about your data..."
                disabled={sending}
                rows={1}
                className="min-h-[52px] max-h-[200px] resize-none flex-1 text-sm"
              />
              <Button
                type="submit"
                disabled={sending || !input.trim()}
                size="lg"
                className="h-[52px] px-4 shrink-0"
              >
                {sending ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <SendHorizonal className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Chat history sidebar */}
      <div className="w-80 hidden lg:block">
        <ChatHistorySidebar
          currentSessionId={currentSessionId || undefined}
          onSessionSelect={loadSession}
          onNewChat={handleNewChat}
        />
      </div>
    </div>
  )
}

