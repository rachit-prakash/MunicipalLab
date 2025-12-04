'use client'

import * as React from 'react'
import { SendHorizonal, Bot, User } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; isTyping?: boolean }

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

// Component for animating text appearance
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

  return <span>{displayedText}</span>
}

export default function ChatbotPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm the Legaside AI Assistant. Ask me anything about your data.",
    },
  ])
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [typingMessageId, setTypingMessageId] = React.useState<string | null>(null)
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

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setSending(true)

    // Create a placeholder for the assistant message
    const assistantMsgId = crypto.randomUUID()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isTyping: true,
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
    <div className="flex flex-col h-full">
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
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    <TypingText text={m.content} />
                  </div>
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
  )
}

