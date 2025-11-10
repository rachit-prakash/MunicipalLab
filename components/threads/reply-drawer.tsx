"use client"

import { useState } from "react"
import type { ThreadRow } from "@/lib/types"
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate, getTopicBadgeClasses } from "@/lib/utils"
import { X, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ReplyDrawerProps {
  thread: ThreadRow
  onClose: () => void
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
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [copied, setCopied] = useState(false)
  const [markedSent, setMarkedSent] = useState(false)
  const { toast } = useToast()

  // Intentionally omit stance and confidence indicators from the modal header per design

  const templateOptions = templates[thread.topic as keyof typeof templates] || {
    SUPPORT: "Thank you for your message...",
    OPPOSE: "We appreciate your feedback...",
    GENERIC: "Thank you for contacting us...",
  }

  const handleSelectTemplate = (stance: string) => {
    setSelectedTemplate(templateOptions[stance as keyof typeof templateOptions] || templateOptions.GENERIC)
    setDraftText(templateOptions[stance as keyof typeof templateOptions] || templateOptions.GENERIC)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draftText || selectedTemplate)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMarkReplied = () => {
    setMarkedSent(true)
    toast({ title: "Reply recorded", description: "A reply was marked and a thread was created." })
    onClose()
  }

  const handleGenerate = () => {
    const aiDraft = `Thank you for your message regarding ${thread.topic.toLowerCase()}. We appreciate you taking the time to share your perspective on this important issue. Your feedback helps us better understand constituent concerns and priorities.`
    setDraftText(aiDraft)
  }

  const citations = [
    {
      title: "Healthcare.gov - Policy Overview",
      url: "https://healthcare.gov",
      snippet: "Overview of current healthcare policies...",
    },
    {
      title: "Congressional Research Service",
      url: "https://crs.gov",
      snippet: "Recent analysis of healthcare reform...",
    },
  ]

  const needsReview = (thread.confidence || 0) < 0.75

  return (
    <Drawer open={true} onOpenChange={onClose}>
      <DrawerContent>
        {/* Header with thread info */}
        <DrawerHeader>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <DrawerTitle className="text-xl font-semibold text-ink-900">{thread.subject}</DrawerTitle>
              <p className="text-sm text-ink-500 mt-1">From: {thread.sender}</p>
              <p className="text-xs text-ink-400">{formatDate(thread.receivedAt)}</p>
            </div>
            <DrawerClose asChild>
              <button className="p-2 hover:bg-subtle rounded transition-colors">
                <X className="h-5 w-5 text-ink-600" />
              </button>
            </DrawerClose>
          </div>

          {/* Badges row (stance and confidence removed) */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="solid" className="bg-ink-100 text-ink-900">
              {thread.type === "CASEWORK" ? "Casework" : "Correspondence"}
            </Badge>
            <Badge variant="solid" className={getTopicBadgeClasses(thread.topic)}>{thread.topic}</Badge>
          </div>
        </DrawerHeader>

        {/* Tabs for Template and AI Draft */}
        <DrawerBody>
          <Tabs defaultValue="template">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="template">Template</TabsTrigger>
              <TabsTrigger value="ai-draft">AI Draft</TabsTrigger>
            </TabsList>

            {/* Template Tab */}
            <TabsContent value="template" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-600">Select template</label>
                <Select onValueChange={handleSelectTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose topic × stance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPORT">Support template</SelectItem>
                    <SelectItem value="OPPOSE">Oppose template</SelectItem>
                    <SelectItem value="GENERIC">Generic template</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-ink-600">Template output</label>
                  <Textarea value={selectedTemplate} readOnly className="min-h-32" />
                </div>
              )}
            </TabsContent>

            {/* AI Draft Tab */}
            <TabsContent value="ai-draft" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Button onClick={handleGenerate} className="w-full">
                  Generate
                </Button>
              </div>

              {draftText && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-ink-600">AI draft</label>
                    <Textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} className="min-h-32" />
                  </div>

                  {/* Needs review removed for now */}

                  {/* Citations panel */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-ink-600">Citations</label>
                    <div className="border border-border rounded-lg p-3 space-y-2 bg-subtle overflow-y-auto max-h-32">
                      {citations.map((citation, i) => (
                        <div key={i} className="text-xs font-mono text-ink-600">
                          <div className="font-medium">{citation.title}</div>
                          <div className="text-ink-500 truncate">{citation.snippet}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Editable draft */}
          {(selectedTemplate || draftText) && (
            <div className="space-y-2 mt-6 border-t border-border pt-6">
              <label className="text-xs font-medium text-ink-600">Edit draft</label>
              <Textarea
                value={draftText || selectedTemplate}
                onChange={(e) => setDraftText(e.target.value)}
                className="min-h-32"
              />
              <div className="text-xs text-ink-400">Last edited just now</div>
            </div>
          )}
        </DrawerBody>

        {/* Footer with actions */}
        {(selectedTemplate || draftText) && (
          <DrawerFooter>
            <Button variant="secondary" size="md" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="secondary" size="md" onClick={handleMarkReplied}>
              Mark replied
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
