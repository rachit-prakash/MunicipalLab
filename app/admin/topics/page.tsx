"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type TopicRow = {
  id: string
  name: string
  status: "active" | "archived"
}

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<TopicRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    void fetchTopics()
  }, [])

  const activeCount = useMemo(() => topics.filter((t) => t.status === "active").length, [topics])

  const fetchTopics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/topics", { cache: "no-store" })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const data = await res.json()
      setTopics(data.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? "Failed to load topics")
    } finally {
      setLoading(false)
    }
  }

  const handleRename = async (id: string, name: string) => {
    try {
      await fetch("/api/admin/topics", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, name }),
      })
      await fetchTopics()
    } catch (e) {
      console.error(e)
    } finally {
      setEditingId(null)
    }
  }

  const addTopic = async () => {
    try {
      await fetch("/api/admin/topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "New topic" }),
      })
      await fetchTopics()
    } catch (e) {
      console.error(e)
    }
  }

  const toggleStatus = async (topic: TopicRow) => {
    try {
      await fetch("/api/admin/topics", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: topic.id,
          status: topic.status === "active" ? "archived" : "active",
        }),
      })
      await fetchTopics()
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
                <h1 className="text-2xl font-semibold text-foreground font-display">Topics</h1>
                <p className="text-sm text-muted-foreground">Define and organize topics ({activeCount} active)</p>
              </div>
              <Button variant="primary" size="md" onClick={addTopic} disabled={loading}>
                Add topic
              </Button>
            </div>

            {error ? (
              <div className="rounded border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow hoverable={false}>
                    <TableHead>Topic</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : topics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No topics yet. Click “Add topic” to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topics.map((topic) => (
                      <TableRow key={topic.id}>
                        <TableCell className="font-medium text-foreground">
                          {editingId === topic.id ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => handleRename(topic.id, editName)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(topic.id, editName)
                              }}
                              autoFocus
                              className="max-w-xs"
                            />
                          ) : (
                            topic.name
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant="solid"
                            className={
                              topic.status === "active"
                                ? "bg-ok/10 text-ok border border-ok/30"
                                : "bg-muted text-foreground"
                            }
                          >
                            {topic.status === "active" ? "Active" : "Archived"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <button
                            onClick={() => {
                              setEditingId(topic.id)
                              setEditName(topic.name)
                            }}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            Rename
                          </button>
                          <span className="mx-2 text-border">•</span>
                          <button
                            onClick={() => toggleStatus(topic)}
                            className={
                              topic.status === "active"
                                ? "text-xs font-medium text-danger hover:text-danger"
                                : "text-xs font-medium text-muted-foreground hover:text-foreground"
                            }
                          >
                            {topic.status === "active" ? "Retire" : "Activate"}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
