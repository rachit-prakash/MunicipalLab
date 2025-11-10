"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts"
import { getTopicColorHex } from "@/lib/utils"

interface TopicsChartProps {
  topics: Array<{ topic: string; count: number }>
}

export function TopicsChart({ topics }: TopicsChartProps) {
  return (
    <div className="border border-border rounded-lg bg-surface p-6 shadow-sm [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden focus:outline-none focus-visible:outline-none">
      <h3 className="text-sm font-semibold text-ink-900 mb-4">Top topics</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topics} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
          <XAxis
            dataKey="topic"
            tick={{ fontSize: 12, fill: "var(--ink-600)" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12, fill: "var(--ink-600)" }} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} isAnimationActive={false}>
            {topics.map((entry) => (
              <Cell key={entry.topic} fill={getTopicColorHex(entry.topic)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
