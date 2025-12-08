'use client'

import * as React from 'react'
import { SendHorizonal, Sparkles, Mail, TrendingUp, Search, Link } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Markdown } from '@/components/ui/markdown'
import { ChatHistorySidebar } from '@/components/chatbot/chat-history-sidebar'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; isTyping?: boolean; saved?: boolean; timestamp?: string }

const messageVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 26 },
  },
}

// Typing animation component
function TypingIndicator() {
  return (
    <div className="flex gap-1 py-2">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="h-2.5 w-2.5 rounded-full bg-muted-foreground/60"
          animate={{ y: ['0%', '-45%', '0%'], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// Helper function to format message timestamps
function formatTime(timestamp?: string) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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

// Suggested prompts component
function SuggestedPrompts({ onPromptClick }: { onPromptClick: (prompt: string) => void }) {
  const prompts = [
    { icon: Sparkles, text: 'Summarize my last 10 emails', gradient: 'from-purple-500 to-pink-500' },
    { icon: Mail, text: 'Show unread messages', gradient: 'from-blue-500 to-cyan-500' },
    { icon: Search, text: 'Find important threads', gradient: 'from-orange-500 to-red-500' },
    { icon: TrendingUp, text: 'Email analytics', gradient: 'from-green-500 to-emerald-500' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
      {prompts.map((prompt, idx) => (
        <motion.button
          key={idx}
          onClick={() => onPromptClick(prompt.text)}
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm",
            "px-5 py-4 text-left transition-all duration-300",
            "hover:border-border hover:bg-card hover:shadow-lg hover:scale-[1.02]",
            "active:scale-[0.98]"
          )}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              "bg-gradient-to-br shadow-sm transition-transform group-hover:scale-110",
              prompt.gradient
            )}>
              <prompt.icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-foreground/90 transition-colors">
                {prompt.text}
              </p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  )
}

export default function ChatbotPage() {
  const { toast } = useToast()
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [typingMessageId, setTypingMessageId] = React.useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null)
  const [showSuggestedPrompts, setShowSuggestedPrompts] = React.useState(true)
  const [emailStats, setEmailStats] = React.useState({ indexed: 0, connected: true })
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Load email stats (replace with actual API call if available)
  React.useEffect(() => {
    // Simulated stats - replace with actual API call
    setEmailStats({ indexed: 1247, connected: true })
  }, [])

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, typingMessageId])

  // Auto-focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle suggested prompt click - automatically send the message
  function handlePromptClick(prompt: string) {
    setInput(prompt)
    setShowSuggestedPrompts(false)
    // Trigger send immediately
    setTimeout(() => {
      const userMsgId = crypto.randomUUID()
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: prompt,
        saved: false,
        timestamp: new Date().toISOString(),
      }
      setMessages([userMsg])
      setInput('')
      setSending(true)

      // Continue with normal send flow
      sendMessageInternal(prompt, userMsgId)
    }, 0)
  }

  // Internal send function that can be called programmatically
  async function sendMessageInternal(content: string, userMsgId: string) {
    // Create session if this is the first message
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await createNewSession(content)
      if (!sessionId) {
        setSending(false)
        return
      }
    }

    // Save user message
    await saveMessage('user', content, userMsgId, sessionId)

    // Create a placeholder for the assistant message
    const assistantMsgId = crypto.randomUUID()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isTyping: true,
      saved: false,
      timestamp: new Date().toISOString(),
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
          messages: [{ role: 'user', content }],
          context,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)

        // Handle rate limit error
        if (res.status === 429 && errorData) {
          const retryAfter = errorData.retryAfter || 30
          const errorMsg = errorData.message || 'Too many requests. Please slow down.'

          toast({
            variant: 'destructive',
            title: '⏱️ Rate Limit Reached',
            description: `You're sending messages too quickly. Please wait ${retryAfter} seconds before trying again.`,
          })

          throw new Error(errorMsg)
        }

        // Handle other errors
        const errorText = errorData?.message || await res.text() || 'Request failed'
        toast({
          variant: 'destructive',
          title: '❌ Error',
          description: errorText,
        })

        throw new Error(errorText)
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
      await saveMessage('assistant', data.content, assistantMsgId, sessionId)

      // Set typing message ID to trigger animation
      setTypingMessageId(assistantMsgId)

      // Clear typing animation after a short delay to show full text
      setTimeout(() => {
        setTypingMessageId(null)
      }, data.content.length * 15 + 500) // Estimate typing time + buffer
    } catch (err: any) {
      // Don't show error in chat if we already showed a toast
      const errorContent = err?.message?.includes('Rate limit') || err?.message?.includes('Too many')
        ? 'Please try again in a moment.'
        : `Sorry, I ran into an error. ${err?.message ?? 'Please try again.'}`

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

  // Save message to session
  async function saveMessage(
    role: 'user' | 'assistant',
    content: string,
    messageId: string,
    sessionIdOverride?: string,
  ) {
    const targetSessionId = sessionIdOverride ?? currentSessionId
    if (!targetSessionId) return

    try {
      const res = await fetch(`/api/assistant/sessions/${targetSessionId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, content }),
      })
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to save message', res.status, errorText)
        return
      }

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

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)

        // Handle rate limit
        if (res.status === 429 && errorData) {
          const retryAfter = errorData.retryAfter || 30
          toast({
            variant: 'destructive',
            title: '⏱️ Rate Limit Reached',
            description: `Too many new chats created. Please wait ${retryAfter} seconds before starting a new conversation.`,
          })
          return null
        }

        const errorText = errorData?.message || await res.text()
        console.error('Failed to create session:', res.status, errorText)
        toast({
          variant: 'destructive',
          title: '❌ Failed to Create Chat',
          description: errorText || 'Could not create a new chat session. Please try again.',
        })
        return null
      }

      const data = await res.json()

      if (!data?.session?.id) {
        console.error('Invalid session response:', data)
        toast({
          variant: 'destructive',
          title: '❌ Invalid Response',
          description: 'Received an invalid response from the server. Please try again.',
        })
        return null
      }

      setCurrentSessionId(data.session.id)
      return data.session.id
    } catch (error) {
      console.error('Failed to create session:', error)
      toast({
        variant: 'destructive',
        title: '❌ Connection Error',
        description: 'Could not connect to the server. Please check your internet connection.',
      })
      return null
    }
  }

  // Load a previous session
  async function loadSession(sessionId: string) {
    try {
      const res = await fetch(`/api/assistant/sessions/${sessionId}`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to load session:', errorData)

        // If session not found (404), it's a stale entry - just start fresh
        if (res.status === 404) {
          toast({
            title: 'ℹ️ Chat Not Found',
            description: 'This chat no longer exists. Starting a new chat.',
          })
          handleNewChat()
          return
        }

        // Handle rate limit
        if (res.status === 429 && errorData) {
          const retryAfter = errorData.retryAfter || 30
          toast({
            variant: 'destructive',
            title: '⏱️ Rate Limit Reached',
            description: `Too many requests. Please wait ${retryAfter} seconds before loading chats.`,
          })
          return
        }

        toast({
          variant: 'destructive',
          title: '❌ Failed to Load Chat',
          description: errorData.message || 'Could not load this chat. Please try again.',
        })

        return
      }

      const data = await res.json()

      if (!data || !data.messages || !Array.isArray(data.messages)) {
        console.error('Invalid session data:', data)
        toast({
          variant: 'destructive',
          title: '❌ Invalid Data',
          description: 'Received invalid chat data. Starting a new chat.',
        })
        handleNewChat()
        return
      }

      setCurrentSessionId(sessionId)

      // If no messages, show welcome screen
      if (data.messages.length === 0) {
        setMessages([])
        setShowSuggestedPrompts(true)
      } else {
        setMessages(data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          saved: true,
          timestamp: msg.created_at || new Date().toISOString(),
        })))
        setShowSuggestedPrompts(false)
      }
    } catch (error) {
      console.error('Failed to load session:', error)
      toast({
        variant: 'destructive',
        title: '❌ Connection Error',
        description: 'Could not connect to the server. Starting a new chat.',
      })
      handleNewChat()
    }
  }

  // Start a new chat
  function handleNewChat() {
    setCurrentSessionId(null)
    setShowSuggestedPrompts(true)
    setMessages([])
    inputRef.current?.focus()
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return

    // Hide suggested prompts once user sends a message
    setShowSuggestedPrompts(false)

    const userMsgId = crypto.randomUUID()
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      saved: false,
      timestamp: new Date().toISOString(),
    }
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
    await saveMessage('user', trimmed, userMsgId, sessionId)

    // Create a placeholder for the assistant message
    const assistantMsgId = crypto.randomUUID()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isTyping: true,
      saved: false,
      timestamp: new Date().toISOString(),
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
        const errorData = await res.json().catch(() => null)

        // Handle rate limit error
        if (res.status === 429 && errorData) {
          const retryAfter = errorData.retryAfter || 30
          const errorMsg = errorData.message || 'Too many requests. Please slow down.'

          toast({
            variant: 'destructive',
            title: '⏱️ Rate Limit Reached',
            description: `You're sending messages too quickly. Please wait ${retryAfter} seconds before trying again.`,
          })

          throw new Error(errorMsg)
        }

        // Handle other errors
        const errorText = errorData?.message || await res.text() || 'Request failed'
        toast({
          variant: 'destructive',
          title: '❌ Error',
          description: errorText,
        })

        throw new Error(errorText)
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
      await saveMessage('assistant', data.content, assistantMsgId, sessionId)

      // Set typing message ID to trigger animation
      setTypingMessageId(assistantMsgId)

      // Clear typing animation after a short delay to show full text
      setTimeout(() => {
        setTypingMessageId(null)
      }, data.content.length * 15 + 500) // Estimate typing time + buffer
    } catch (err: any) {
      // Don't show error in chat if we already showed a toast
      const errorContent = err?.message?.includes('Rate limit') || err?.message?.includes('Too many')
        ? 'Please try again in a moment.'
        : `Sorry, I ran into an error. ${err?.message ?? 'Please try again.'}`

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

  const bubbleBaseClasses =
    'px-5 py-3.5 rounded-3xl text-sm leading-relaxed max-w-[85%] sm:max-w-[70%] shadow-sm'

  const isWelcomeOnly = messages.length === 0 && showSuggestedPrompts

  return (
    <div className="flex h-full bg-background">
      <div className="flex flex-1 flex-col relative">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto bg-background px-4 sm:px-6">
          <div className={cn(
            "mx-auto flex w-full max-w-4xl flex-col space-y-4",
            isWelcomeOnly ? "min-h-full items-center justify-center" : "py-6"
          )}>
            {/* Show welcome screen when no messages */}
            {isWelcomeOnly && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-center mb-6">
                  <h1 className="text-3xl sm:text-4xl font-medium text-foreground">
                    What can I help with?
                  </h1>
                </div>
                <SuggestedPrompts onPromptClick={handlePromptClick} />
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m, idx) => (
                <motion.div
                  key={m.id}
                  layout
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className={cn('flex flex-col gap-2', m.role === 'user' ? 'items-end' : 'items-start')}
                >
                  <motion.div
                    className={cn(
                      bubbleBaseClasses,
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))]/90 text-primary-foreground shadow-md'
                        : 'bg-muted/70 dark:bg-muted/50 text-foreground border border-border/50'
                    )}
                    layout
                  >
                    {m.isTyping && m.role === 'assistant' ? (
                      <TypingIndicator />
                    ) : m.role === 'assistant' && m.content && typingMessageId === m.id ? (
                      <TypingText text={m.content} />
                    ) : m.role === 'assistant' ? (
                      <Markdown>{m.content}</Markdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </motion.div>
                  {/* Timestamp */}
                  {m.timestamp && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-xs text-muted-foreground/60 px-2"
                    >
                      {formatTime(m.timestamp)}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && typingMessageId === null && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 items-start"
              >
                <div className={cn(bubbleBaseClasses, 'bg-muted/70 dark:bg-muted/50 text-foreground border border-border/50')}>
                  <TypingIndicator />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <motion.div
          layout
          className={cn(
            "px-4 py-4 sm:px-6",
            isWelcomeOnly
              ? "absolute bottom-8 left-0 right-0"
              : "border-t border-border/50 bg-muted/20 backdrop-blur-sm"
          )}
        >
          <form onSubmit={sendMessage} className="mx-auto flex w-full max-w-4xl items-end gap-3">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask a question about your data..."
              disabled={sending}
              rows={1}
              className="min-h-[52px] max-h-[200px] flex-1 resize-none rounded-3xl border border-border/50 bg-background px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 shadow-sm"
            />
            <Button
              type="submit"
              disabled={sending || !input.trim()}
              size="lg"
              variant="primary"
              className="h-[52px] w-[52px] rounded-full p-0 shadow-md hover:shadow-lg transition-shadow"
            >
              {sending ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <SendHorizonal className="h-5 w-5" />
              )}
            </Button>
          </form>

          {/* Context Indicator at bottom */}
          {emailStats.connected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mx-auto flex w-full max-w-4xl items-center justify-center gap-2 mt-3 text-xs text-muted-foreground"
            >
              <Link className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <span className="font-medium">Connected to Gmail</span>
              <span className="text-muted-foreground/70">•</span>
              <span>{emailStats.indexed.toLocaleString()} emails indexed</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Chat history sidebar */}
      <div className="hidden w-80 shrink-0 border-l border-border/50 lg:block">
        <ChatHistorySidebar
          currentSessionId={currentSessionId || undefined}
          onSessionSelect={loadSession}
          onNewChat={handleNewChat}
        />
      </div>
    </div>
  )
}
