"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts"
import { getTopicColorHex } from "@/lib/utils"

interface TopicsChartProps {
  topics: Array<{ topic: string; count: number }>
}

export function TopicsChart({ topics }: TopicsChartProps) {
  return (
    <div className="border border-border rounded-xl bg-card p-6 shadow-sm hover:shadow-md transition-shadow [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden focus:outline-none focus-visible:outline-none">
      <h3 className="text-sm font-semibold text-foreground mb-4">Top topics</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={topics} margin={{ left: -20, right: 10, top: 10, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="topic"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
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
