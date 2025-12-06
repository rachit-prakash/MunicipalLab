'use client'

import * as React from 'react'
import { SendHorizonal, Bot, User } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Markdown } from '@/components/ui/markdown'
import { ChatHistorySidebar } from '@/components/chatbot/chat-history-sidebar'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; isTyping?: boolean; saved?: boolean }

const messageVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 26 },
  },
}

const avatarVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 18 } },
}

// Typing animation component
function TypingIndicator() {
  return (
    <div className="flex gap-1 py-2">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="h-2.5 w-2.5 rounded-full bg-muted-foreground/80"
          animate={{ y: ['0%', '-45%', '0%'], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
        />
      ))}
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
  const { toast } = useToast()
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
      
      // If no messages, show welcome message
      if (data.messages.length === 0) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm the Legaside AI Assistant. Ask me anything about your data.",
            saved: true,
          },
        ])
      } else {
        setMessages(data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          saved: true,
        })))
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
    await saveMessage('user', trimmed, userMsgId, sessionId)

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
    'px-4 py-3 rounded-lg text-sm leading-relaxed max-w-[85%] sm:max-w-[70%]'

  return (
    <div className="flex h-full bg-muted">
      <div className="flex flex-1 flex-col">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto bg-muted px-4 py-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {m.role === 'assistant' && (
                    <motion.div
                      variants={avatarVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary"
                    >
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </motion.div>
                  )}
                  <motion.div
                    className={cn(
                      bubbleBaseClasses,
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground border border-border shadow-sm'
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
                  {m.role === 'user' && (
                    <motion.div
                      variants={avatarVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary"
                    >
                      <User className="h-4 w-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && typingMessageId === null && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className={cn(bubbleBaseClasses, 'bg-card text-card-foreground border border-border shadow-sm')}>
                  <TypingIndicator />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-card px-4 py-4 sm:px-6">
          <form onSubmit={sendMessage} className="mx-auto flex w-full max-w-4xl items-end gap-3">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask a question about your data..."
              disabled={sending}
              rows={1}
              className="min-h-[48px] max-h-[200px] flex-1 resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-ring focus-visible:ring-0"
            />
            <Button
              type="submit"
              disabled={sending || !input.trim()}
              size="lg"
              variant="primary"
              className="h-[48px] rounded-lg px-5 text-sm font-medium"
            >
              {sending ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <SendHorizonal className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Chat history sidebar */}
      <div className="hidden w-80 shrink-0 border-l border-border lg:block">
        <ChatHistorySidebar
          currentSessionId={currentSessionId || undefined}
          onSessionSelect={loadSession}
          onNewChat={handleNewChat}
        />
      </div>
    </div>
  )
}

