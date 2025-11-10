"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useMemo, useState } from "react"

interface StanceTrendChartProps {
  trendsByTopic: Record<string, Array<{ date: string; support: number; oppose: number; neutral: number }>>
  defaultTopic?: string
}

export function StanceTrendChart({ trendsByTopic, defaultTopic }: StanceTrendChartProps) {
  const topicKeys = Object.keys(trendsByTopic || {})
  const [selectedTopic, setSelectedTopic] = useState<string>(defaultTopic && topicKeys.includes(defaultTopic) ? defaultTopic : topicKeys[0] ?? "")
  const data = useMemo(() => trendsByTopic[selectedTopic] ?? [], [selectedTopic, trendsByTopic])

  return (
    <div className="border border-border rounded-lg bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-sm font-semibold text-ink-900">Support vs. oppose 30d</h3>
        {topicKeys.length > 0 ? (
          <select
            className="text-sm border rounded-md px-2 py-1 bg-surface"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            {topicKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--ink-600)" }} />
          <YAxis tick={{ fontSize: 12, fill: "var(--ink-600)" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--ink-100)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line type="monotone" dataKey="support" stroke="var(--chart-1)" strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="oppose" stroke="var(--chart-2)" strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="neutral" stroke="var(--chart-3)" strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
