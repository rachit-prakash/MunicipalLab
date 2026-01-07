"use client"

import { useState, useEffect } from "react"
import type { ThreadRow } from "@/lib/types"
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import { X, Copy, Check, ChevronDown, ChevronUp, Sparkles, FileText, Send, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ConstituentProfileCard } from "@/components/constituents/profile-card"
import { HtmlEmail } from "@/components/ui/html-email"
import { decodeHtmlEntities } from "@/lib/html-decode"

interface ReplyDrawerProps {
  thread: ThreadRow
  onClose: () => void
}

interface Message {
  id: string
  from: string
  date: string
  snippet: string
  body?: string
  isOutbound?: boolean
}

interface ThreadData {
  thread: {
    id: string
    gmail_thread_id: string
    subject: string
    last_message_ts: string
  }
  messages: Message[]
}

// Sample templates
const templates = {
  Healthcare: {
    SUPPORT: "Thank you for your support of healthcare reform. Your voice matters in this important discussion...",
    OPPOSE: "We appreciate your concerns regarding healthcare policy. We take constituent feedback seriously...",
    GENERIC: "Thank you for reaching out to our office regarding healthcare matters...",
  },
  Immigration: {
    SUPPORT: "We are grateful for your support of our immigration policy position...",
    OPPOSE: "We value your perspective on immigration matters and appreciate your engagement...",
    GENERIC: "Thank you for contacting us about immigration...",
  },
}

export function ReplyDrawer({ thread, onClose }: ReplyDrawerProps) {
  const [draftText, setDraftText] = useState("")
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showThreadHistory, setShowThreadHistory] = useState(false)
  const [showCitations, setShowCitations] = useState(true)
  const [threadData, setThreadData] = useState<ThreadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  // Fetch full thread data
  const fetchThread = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      const url = refresh
        ? `/api/gmail/threads/${thread.id}?refresh=true`
        : `/api/gmail/threads/${thread.id}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setThreadData(data)
        if (refresh) {
          toast({ title: "Refreshed", description: "Message content updated from Gmail." })
        }
      }
    } catch (error) {
      console.error("Failed to fetch thread:", error)
      if (refresh) {
        toast({ title: "Refresh failed", description: "Could not refresh message content.", variant: "destructive" })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchThread()
  }, [thread.id])

  const templateOptions = templates[thread.topic as keyof typeof templates] || {
    SUPPORT: "Thank you for your message...",
    OPPOSE: "We appreciate your feedback...",
    GENERIC: "Thank you for contacting us...",
  }

  const handleSelectTemplate = (stance: string) => {
    const template = templateOptions[stance as keyof typeof templateOptions] || templateOptions.GENERIC
    setDraftText(template)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draftText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: "Copied to clipboard", description: "Draft reply has been copied." })
  }

  const handleMarkReplied = async () => {
    try {
      const response = await fetch(`/api/gmail/threads/${thread.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isReplied: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as replied');
      }

      toast({
        title: "Reply recorded",
        description: "This thread has been marked as replied."
      });

      onClose();

      // Dispatch event to refresh threads list
      window.dispatchEvent(new CustomEvent('thread-updated', {
        detail: { threadId: thread.id, isReplied: true }
      }));
    } catch (error) {
      console.error('Error marking as replied:', error);
      toast({
        title: "Error",
        description: "Could not mark thread as replied. Please try again.",
        variant: "destructive"
      });
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500))

    const topicText = thread.topic ? `regarding ${thread.topic.toLowerCase()}` : "your message";
    const senderName = thread.sender.split("@")[0] || "there";

    const aiDraft = `Dear ${senderName},

Thank you for taking the time to contact our office ${topicText}. We appreciate you sharing your perspective on this important issue.

Your feedback is valuable and helps us better understand the concerns and priorities of our constituents. We take your input seriously as we work to address the challenges facing our community.

${thread.stance === "SUPPORT"
        ? "We're grateful for your support on this matter and will continue working to advance this important cause."
        : thread.stance === "OPPOSE"
          ? "We understand your concerns and respect your perspective. We will carefully consider all viewpoints as we move forward."
          : "We will carefully review your comments and take them into account in our ongoing work on this issue."}

If you have any additional questions or would like to discuss this further, please don't hesitate to reach out to our office.`
    setDraftText(aiDraft)
    setIsGenerating(false)
  }

  const handleSend = async () => {
    if (!draftText.trim()) {
      toast({
        title: "Error",
        description: "Please write a message before sending.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      // Get the first message's gmail_message_id for threading
      const firstMessage = threadData?.messages?.[0];
      const inReplyTo = firstMessage?.id;
      const references = firstMessage?.id;

      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: thread.sender,
          subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
          message: draftText,
          threadId: threadData?.thread?.gmail_thread_id,
          inReplyTo,
          references,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      toast({
        title: "Email sent!",
        description: "Your reply has been sent successfully."
      });

      // Refresh the thread to show the new message
      await fetchThread(true);

      // Close the drawer
      onClose();

      // Dispatch event to refresh threads list
      window.dispatchEvent(new CustomEvent('thread-updated', {
        detail: { threadId: thread.id, isReplied: true }
      }));
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Send failed",
        description: error instanceof Error ? error.message : "Could not send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  }

  const citations = [
    {
      title: "Healthcare.gov - Policy Overview",
      url: "https://healthcare.gov",
      snippet: "Comprehensive overview of current healthcare policies and programs available to constituents.",
    },
    {
      title: "Congressional Research Service - Healthcare Reform Analysis",
      url: "https://crs.gov/healthcare-2024",
      snippet: "Recent analysis of proposed healthcare reform legislation and its potential impact.",
    },
    {
      title: "Office Policy Brief - Healthcare Access",
      url: "#",
      snippet: "Internal policy position on improving healthcare access and affordability.",
    },
  ]

  const originalMessage = threadData?.messages?.[0]
  const threadHistory = threadData?.messages?.slice(1) || []

  return (
    <Drawer open={true} onOpenChange={onClose}>
      <DrawerContent className="max-w-[70vw]">
        {/* Header */}
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-xl font-semibold text-foreground mb-2">
                {thread.subject}
              </DrawerTitle>
              <div className="text-sm text-muted-foreground">
                {formatDate(thread.receivedAt)}
              </div>
            </div>
            <DrawerClose asChild>
              <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <DrawerBody className="space-y-6">
          {/* Original Email Content */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Original Email
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchThread(true)}
                disabled={refreshing}
                title="Refresh message content from Gmail"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {loading ? (
              <div className="bg-muted/30 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-start gap-3 mb-3 pb-3 border-b border-border">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                    {thread.sender[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">
                      <ConstituentProfileCard email={thread.sender} currentUrgency={thread.urgencyLevel}>
                        <span className="hover:text-primary transition-colors cursor-pointer">
                          {thread.sender}
                        </span>
                      </ConstituentProfileCard>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {originalMessage?.date ? formatDate(originalMessage.date) : formatDate(thread.receivedAt)}
                    </div>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-foreground max-h-[300px] overflow-y-auto">
                  {originalMessage?.body ? (
                    <HtmlEmail content={originalMessage.body} />
                  ) : (
                    <p className="text-muted-foreground italic">
                      {thread.summary || "Email content not available"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Thread History */}
            {threadHistory.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowThreadHistory(!showThreadHistory)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showThreadHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showThreadHistory ? "Hide" : "Show"} thread history ({threadHistory.length} {threadHistory.length === 1 ? "message" : "messages"})
                </button>

                {showThreadHistory && (
                  <div className="mt-3 space-y-3">
                    {threadHistory.map((msg, idx) => (
                      <div key={msg.id || idx} className="bg-muted/20 rounded-lg p-4 border border-border/50">
                        <div className="flex items-center gap-2 mb-2 text-sm">
                          <span className={msg.isOutbound ? "text-primary font-medium" : "text-foreground font-medium"}>
                            {msg.isOutbound ? "You" : msg.from}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{formatDate(msg.date)}</span>
                        </div>
                        <div className="prose prose-sm max-w-none text-foreground">
                          {msg.body ? (
                            <HtmlEmail content={msg.body} />
                          ) : (
                            <p className="text-muted-foreground italic">
                              Message content not available
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Reply Composition */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Your Reply
              </h3>
              <Button
                onClick={handleGenerate}
                variant="secondary"
                disabled={isGenerating}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate AI Reply"}
              </Button>
            </div>

            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Type your reply here, or use AI to get started..."
              className="min-h-[300px] font-mono text-sm text-white dark:text-white"
            />

            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-muted-foreground">
                {draftText.length > 0 && (
                  <>
                    {draftText.split(/\s+/).filter(w => w).length} words · {draftText.length} characters
                  </>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Last edited just now
              </div>
            </div>
          </section>

          {/* Citations */}
          {draftText && (
            <section>
              <button
                onClick={() => setShowCitations(!showCitations)}
                className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide mb-3 hover:text-primary transition-colors"
              >
                {showCitations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Citations & References ({citations.length})
              </button>

              {showCitations && (
                <div className="space-y-3">
                  {citations.map((citation, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="text-xs font-mono text-muted-foreground mt-0.5">
                          [{i + 1}]
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-foreground mb-1">
                            {citation.title}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {citation.snippet}
                          </div>
                          {citation.url !== "#" && (
                            <a
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              {citation.url}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </DrawerBody>

        {/* Footer */}
        {draftText && (
          <DrawerFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                Ready to send or copy your reply
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button variant="secondary" onClick={handleMarkReplied}>
                  Mark as Replied
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSend}
                  disabled={isSending || !draftText.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
