"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FiltersToolbarProps {
  onFiltersChange: (filters: {
    type: string
    topics: string[]
  }) => void
}

const topics = ["Healthcare", "Immigration", "Education", "Infrastructure", "Environment", "Defense", "Economy"]

export function FiltersToolbar({ onFiltersChange }: FiltersToolbarProps) {
  const [type, setType] = useState("both")
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  const handleTypeChange = (value: string) => {
    setType(value)
    onFiltersChange({ type: value, topics: selectedTopics })
  }

  const handleReset = () => {
    setType("both")
    setSelectedTopics([])
    onFiltersChange({ type: "both", topics: [] })
  }

  return (
    <div className="sticky top-16 border-b border-border bg-background px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-900">Filters</h3>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Type filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-600">Type</label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="casework">Casework</SelectItem>
              <SelectItem value="correspondence">Correspondence</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Topic filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-600">Topic</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <span className="truncate text-left">
                  {selectedTopics.length === 0 ? "All topics" : selectedTopics.join(", ")}
                </span>
                <span className="text-ink-500">▼</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTopics([])
                  onFiltersChange({ type, topics: [] })
                }}
              >
                All topics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {topics.map((topic) => {
                const checked = selectedTopics.includes(topic)
                return (
                  <DropdownMenuCheckboxItem
                    key={topic}
                    checked={checked}
                    onCheckedChange={() => {
                      const updated = checked
                        ? selectedTopics.filter((t) => t !== topic)
                        : [...selectedTopics, topic]
                      setSelectedTopics(updated)
                      onFiltersChange({ type, topics: updated })
                    }}
                  >
                    {topic}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        
      </div>
    </div>
  )
}
