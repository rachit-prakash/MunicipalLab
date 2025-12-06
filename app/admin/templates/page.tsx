"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

type TemplateRow = {
  id: string
  topic_id: string | null
  topic_name?: string | null
  stance: string
  version: number
  content: string
  updated_at: string
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftContent, setDraftContent] = useState("")
  const [draftStance, setDraftStance] = useState("GENERIC")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchTemplates()
  }, [])

  const selectedTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedId) ?? null,
    [templates, selectedId],
  )

  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/templates", { cache: "no-store" })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const data = await res.json()
      setTemplates(data.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? "Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (template: TemplateRow) => {
    setSelectedId(template.id)
    setDraftContent(template.content)
    setDraftStance(template.stance)
  }

  const handleSave = async () => {
    if (!selectedId) return
    try {
      await fetch("/api/admin/templates", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selectedId, content: draftContent, stance: draftStance }),
      })
      await fetchTemplates()
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreate = async () => {
    try {
      await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "New template content...", stance: "GENERIC" }),
      })
      await fetchTemplates()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
      <div className="flex-1 flex flex-col ml-0 md:ml-[var(--app-sidebar-width,256px)]">
        <Suspense fallback={null}>
          <Header onMenuClick={() => setMobileNavOpen(true)} />
        </Suspense>
        <main className="mt-16 flex-1 overflow-auto">
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground font-display">Templates</h1>
                <p className="text-sm text-muted-foreground">Maintain reply templates per topic & stance</p>
              </div>
              <Button variant="primary" size="md" onClick={handleCreate} disabled={loading}>
                Add template
              </Button>
            </div>

            {error ? (
              <div className="rounded border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1 md:col-span-2 border border-border rounded-lg bg-card overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow hoverable={false}>
                      <TableHead>Topic</TableHead>
                      <TableHead className="hidden sm:table-cell">Stance</TableHead>
                      <TableHead className="hidden sm:table-cell">Version</TableHead>
                      <TableHead className="hidden sm:table-cell">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No templates yet. Add one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((template) => (
                        <TableRow
                          key={template.id}
                          onClick={() => handleSelect(template)}
                          className={`cursor-pointer ${selectedId === template.id ? "bg-blue-50/70" : ""}`}
                        >
                          <TableCell className="font-medium">
                            {template.topic_name ?? "Uncategorized"}
                          </TableCell>
                          <TableCell className="text-gray-600 hidden sm:table-cell">
                            {template.stance}
                          </TableCell>
                          <TableCell className="text-gray-600 hidden sm:table-cell">
                            v{template.version}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                            {formatDate(template.updated_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {selectedTemplate ? (
                <div className="border border-border rounded-lg bg-card p-6 shadow-sm h-fit space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Editing {selectedTemplate.topic_name ?? "Uncategorized"} ({selectedTemplate.stance})
                    </p>
                    <p className="text-xs text-muted-foreground">Version {selectedTemplate.version}</p>
                  </div>
                  <Textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    className="min-h-48"
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" size="md" className="flex-1" onClick={handleSave}>
                      Save
                    </Button>
                    <Button variant="ghost" size="md" className="flex-1" onClick={() => setSelectedId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-gray-300 rounded-lg p-6 text-muted-foreground">
                  Select a template to edit its content.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
