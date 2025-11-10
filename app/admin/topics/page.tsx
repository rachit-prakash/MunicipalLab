"use client"

import { Suspense, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { TopicRow } from "@/lib/types"

// Sample data
const sampleTopics: TopicRow[] = [
  { id: "1", name: "Healthcare", usageCount: 245, status: "active" },
  { id: "2", name: "Immigration", usageCount: 198, status: "active" },
  { id: "3", name: "Infrastructure", usageCount: 156, status: "active" },
  { id: "4", name: "Education", usageCount: 142, status: "active" },
  { id: "5", name: "Environment", usageCount: 118, status: "active" },
  { id: "6", name: "Defense", usageCount: 89, status: "active" },
  { id: "7", name: "Economy", usageCount: 76, status: "archived" },
]

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState(sampleTopics)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleRename = (id: string, newName: string) => {
    setTopics(topics.map((t) => (t.id === id ? { ...t, name: newName } : t)))
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
                <h1 className="text-2xl font-semibold text-ink-900">Topics</h1>
                <p className="text-sm text-ink-500">Define and organize topics</p>
              </div>
              <Button variant="primary" size="md">
                Add topic
              </Button>
            </div>

            <div className="border border-border rounded-lg bg-surface overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow hoverable={false}>
                    <TableHead>Topic</TableHead>
                    <TableHead className="hidden sm:table-cell">Usage count</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell className="font-medium text-ink-900">
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
                      <TableCell className="text-ink-600 hidden sm:table-cell">{topic.usageCount}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="solid"
                          className={
                            topic.status === "active"
                              ? "bg-ok/10 text-ok border border-ok/30"
                              : "bg-ink-100 text-ink-900"
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
                          className="text-xs font-medium text-ink-600 hover:text-ink-900"
                        >
                          Rename
                        </button>
                        <span className="mx-2 text-ink-300">•</span>
                        <button className="text-xs font-medium text-ink-600 hover:text-ink-900">Merge</button>
                        <span className="mx-2 text-ink-300">•</span>
                        <button className="text-xs font-medium text-danger hover:text-danger">Retire</button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
