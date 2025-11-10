"use client"

import { Suspense, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { TemplateRow } from "@/lib/types"
import { formatDate } from "@/lib/utils"

// Sample data
const sampleTemplates: TemplateRow[] = [
  {
    id: "1",
    topic: "Healthcare",
    stance: "SUPPORT",
    version: 3,
    updatedAt: "2025-10-31T12:00:00Z",
    content: "Thank you for your support of healthcare reform...",
  },
  {
    id: "2",
    topic: "Healthcare",
    stance: "OPPOSE",
    version: 2,
    updatedAt: "2025-10-30T10:00:00Z",
    content: "We appreciate your concerns regarding healthcare policy...",
  },
  {
    id: "3",
    topic: "Immigration",
    stance: "GENERIC",
    version: 1,
    updatedAt: "2025-10-29T14:00:00Z",
    content: "Thank you for contacting us about immigration...",
  },
  {
    id: "4",
    topic: "Infrastructure",
    stance: "SUPPORT",
    version: 2,
    updatedAt: "2025-10-28T09:00:00Z",
    content: "We are grateful for your support of infrastructure investment...",
  },
]

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState(sampleTemplates)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleSave = (id: string) => {
    setTemplates(
      templates.map((t) => (t.id === id ? { ...t, content: editContent, updatedAt: new Date().toISOString() } : t)),
    )
    setEditingId(null)
  }

  

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
      <div className="flex-1 flex flex-col ml-0 md:ml-[var(--app-sidebar-width,256px)]">
        <Suspense fallback={null}>
          <Header onMenuClick={() => setMobileNavOpen(true)} />
        </Suspense>
        <main className="mt-16 flex-1 overflow-auto">
          <div className="px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-ink-900">Templates</h1>
                <p className="text-sm text-ink-500">Manage response templates</p>
              </div>
              <Button variant="primary" size="md">
                Add template
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: Templates table */}
              <div className="col-span-1 md:col-span-2 border border-border rounded-lg bg-surface overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow hoverable={false}>
                      <TableHead>Topic</TableHead>
                      <TableHead className="hidden sm:table-cell">Version</TableHead>
                      <TableHead className="hidden sm:table-cell">Updated</TableHead>
                      <TableHead className="hidden sm:table-cell">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow
                        key={template.id}
                        onClick={() => {
                          setEditingId(template.id)
                          setEditContent(template.content)
                          setEditNotes("")
                        }}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium">{template.topic}</TableCell>
                        <TableCell className="text-ink-600 hidden sm:table-cell">v{template.version}</TableCell>
                        <TableCell className="text-xs text-ink-500 hidden sm:table-cell">{formatDate(template.updatedAt)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(template.id)
                              setEditContent(template.content)
                            }}
                            className="text-xs font-medium text-ink-600 hover:text-ink-900"
                          >
                            Edit
                          </button>
                          <span className="mx-2 text-ink-300">•</span>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-ink-600 hover:text-ink-900"
                          >
                            Duplicate
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Right: Editor panel */}
              {editingId && (
                <div className="border border-border rounded-lg bg-surface p-6 shadow-sm h-fit">
                  <h3 className="text-sm font-semibold text-ink-900 mb-4">Edit template</h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-ink-600">Content</label>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-32"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-ink-600">Version notes</label>
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="min-h-20"
                        placeholder="Describe your changes..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button variant="primary" size="md" onClick={() => handleSave(editingId)} className="flex-1">
                        Save
                      </Button>
                      <Button variant="ghost" size="md" onClick={() => setEditingId(null)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
